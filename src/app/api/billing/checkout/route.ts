import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { planName, cycle } = await req.json();

  // Stripe 키 미설정 시 모의 응답
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "") {
    return NextResponse.json({ url: "/billing?demo=true", message: "Stripe 미설정 — 데모 모드" });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId! },
    include: { plan: true },
  });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const plan = await prisma.plan.findFirst({ where: { name: planName.toUpperCase() } });
  const priceId = cycle === "yearly" ? plan?.stripePriceIdY : plan?.stripePriceId;
  if (!priceId) return NextResponse.json({ error: "Stripe Price ID 미설정" }, { status: 400 });

  const stripe = getStripe();

  let customerId = company.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: company.name,
      metadata: { companyId: company.id },
    });
    customerId = customer.id;
    await prisma.company.update({ where: { id: company.id }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/billing`,
    subscription_data: {
      metadata: { companyId: company.id },
      trial_period_days: company.subscriptionStatus === "TRIAL" ? undefined : 0,
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
