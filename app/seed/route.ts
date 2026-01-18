import bcrypt from 'bcrypt'
import client from '@/app/lib/mongodb'
import { invoices, customers, revenue, users } from '../lib/placeholder-data'
import prisma from '@/app/lib/prisma';

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
        status: invoice.status,
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
  try {
    await seedUsers();
   // await seedCustomers();
    console.log(invoices);
    await seedInvoices();
    await seedRevenue();

    return Response.json({ message: 'MongoDB + Prisma seeded successfully' });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Seeding failed' }, { status: 500 });
  }
}
