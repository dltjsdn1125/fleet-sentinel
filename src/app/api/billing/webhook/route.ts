import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const companyId = (event.data.object as { metadata?: { companyId?: string } }).metadata?.companyId;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = event.data.object as unknown as {
        id: string;
        status: string;
        current_period_end: number;
        metadata?: { companyId?: string };
      };
      const cId = sub.metadata?.companyId ?? companyId;
      if (!cId) break;
      await prisma.company.update({
        where: { id: cId },
        data: {
          stripeSubId: sub.id,
          subscriptionStatus: sub.status === "active" ? "ACTIVE" : "PAST_DUE",
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as { metadata?: { companyId?: string } };
      const cId = sub.metadata?.companyId ?? companyId;
      if (!cId) break;
      await prisma.company.update({
        where: { id: cId },
        data: { subscriptionStatus: "CANCELED" },
      });
      break;
    }

    case "invoice.paid": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inv = event.data.object as unknown as {
        id: string;
        amount_paid: number;
        status: string;
        subscription: string;
        period_start: number;
        period_end: number;
      };
      // 청구서 기록
      const company = await prisma.company.findFirst({
        where: { stripeSubId: inv.subscription as string },
      });
      if (company) {
        await prisma.invoice.create({
          data: {
            stripeInvoiceId: inv.id,
            amountKrw: Math.round(inv.amount_paid / 100), // Stripe는 원화 최소단위 = 원
            status: inv.status,
            paidAt: new Date(),
            periodStart: new Date(inv.period_start * 1000),
            periodEnd: new Date(inv.period_end * 1000),
            companyId: company.id,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
