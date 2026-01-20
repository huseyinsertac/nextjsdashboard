export const dynamic = 'force-dynamic'
import bcrypt from 'bcrypt'
import client from '@/app/lib/mongodb'
import { invoices, customers, revenue, users } from '@/app/lib/placeholder-data'
import prisma from '@/app/lib/prisma';
import type {InvoiceStatus} from '@/generated/prisma/client'
import { NextResponse } from 'next/server'

const mongodb = client.db('dashboard');
async function seedUsers() {
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
      },
    });
  }
}

async function seedInvoices() {
  const customers = await prisma.customer.findMany();

  const customerMap = new Map(
    customers.map((c) => [c.email.toLowerCase(), c.id])
  );

  await prisma.invoice.createMany({
    data: invoices.map((invoice) => {
      if (!invoice.customerEmail) {
        throw new Error('invoice.customerEmail is missing');
      }

      const customerId = customerMap.get(
        invoice.customerEmail.toLowerCase()
      );

      if (!customerId) {
        throw new Error(
          `Customer not found for ${invoice.customerEmail}`
        );
      }

      return {
        customerId,
        amount: invoice.amount,
        status: invoice.status as InvoiceStatus,
        date: new Date(invoice.date),
      };
    }),
  });
}

async function seedCustomers() {
  await prisma.customer.createMany({
    data: customers,
    
  });
}



async function seedRevenue() {
  await prisma.revenue.createMany({
    data: revenue,
    
  });
}


export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: 'Seeding disabled in production' },
      { status: 403 }
    )
  }

  try {
    //await seedCustomers();	  
    await seedUsers()
    //await seedInvoices()
    //await seedRevenue()

    return NextResponse.json({ message: 'Seed completed' })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Seeding failed' },
      { status: 500 }
    )
  }
}

