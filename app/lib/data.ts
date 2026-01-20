//"use server"
export const dynamic = 'force-dynamic'
import { cache } from 'react';
import { notFound } from 'next/navigation';
import prisma from '@/app/lib/prisma';
import client from '@/app/lib/mongodb';
const mongodb = client.db('dashboard');
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { InvoiceStatus, Prisma } from '@/generated/prisma/client';
import type { Invoice } from '@/generated/prisma/client';

export async function fetchRevenue() {
  try {
    const data = await prisma.revenue.findMany();
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return Object.values(InvoiceStatus).includes(value as InvoiceStatus);
}

export async function fetchLatestInvoices() {
  try {
	  const data = await prisma.invoice.findMany({
    orderBy: {
      date: 'desc',
    },
    take: 5,
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          image_url: true,
        },
      },
    },
  });

  const latestInvoices = data.map((invoice) => ({
    id: invoice.id,
    amount: formatCurrency(invoice.amount),
    name: invoice.customer.name,
    email: invoice.customer.email,
    image_url: invoice.customer.image_url,
  }));

  return latestInvoices;
      } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}


export async function fetchCardData() {
  try {
    const invoiceCountPromise = prisma.invoice.count();

    const customerCountPromise = prisma.customer.count();

    const paidInvoicesPromise = prisma.invoice.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
    });

    const pendingInvoicesPromise = prisma.invoice.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
    });

    const [
      numberOfInvoices,
      numberOfCustomers,
      paidInvoices,
      pendingInvoices,
    ] = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      paidInvoicesPromise,
      pendingInvoicesPromise,
    ]);

    return {
      numberOfInvoices,
      numberOfCustomers,
      totalPaidInvoices: formatCurrency(paidInvoices._sum.amount ?? 0),
      totalPendingInvoices: formatCurrency(pendingInvoices._sum.amount ?? 0),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // ✅ DEFAULT: no search → return all invoices
  if (query.trim() === '') {
    return prisma.invoice.findMany({
      orderBy: { date: 'desc' },
      take: ITEMS_PER_PAGE,
      skip: offset,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
    });
  }

  try {
    const OR: any[] = [];

    if (Object.values(InvoiceStatus).includes(query as InvoiceStatus)) {
      OR.push({ status: query as InvoiceStatus });
    }

    if (!Number.isNaN(Number(query))) {
      OR.push({ amount: Number(query) });
    }

    OR.push({
      customer: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    return prisma.invoice.findMany({
      where: { OR },
      orderBy: { date: 'desc' },
      take: ITEMS_PER_PAGE,
      skip: offset,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}







export async function fetchInvoicesPages(query: string) {
  // ✅ NO SEARCH → count all invoices
  if (query.trim() === '') {
    const count = await prisma.invoice.count();
    return Math.ceil(count / ITEMS_PER_PAGE);
  }

  try {
    const OR: any[] = [];

    if (Object.values(InvoiceStatus).includes(query as InvoiceStatus)) {
      OR.push({ status: query as InvoiceStatus });
    }

    if (!Number.isNaN(Number(query))) {
      OR.push({ amount: Number(query) });
    }

    OR.push({
      customer: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    const count = await prisma.invoice.count({
      where: { OR },
    });

    return Math.ceil(count / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}







//export async function fetchInvoicesPages(query: string) {
//  try {
//    const where = {
//      OR: [
//        {
//          customer: {
//            name: {
//              contains: query,
//              mode: 'insensitive',
//            },
//          },
//        },
//        {
//          customer: {
//            email: {
//              contains: query,
//              mode: 'insensitive',
//            },
//          },
//        },
//        {
//          status: {
//            contains: query,
//            mode: 'insensitive',
//          },
//        },
//        // numeric search
//        ...(Number.isNaN(Number(query))
//          ? []
//          : [
//              {
//                amount: {
//                  equals: Number(query),
//                },
//              },
//            ]),
//        // date search
//        ...(isNaN(Date.parse(query))
//          ? []
//          : [
//              {
//                date: {
//                  equals: new Date(query),
//                },
//              },
//            ]),
//      ],
//    };
//
//    const count = await prisma.invoice.count({
//      where,
//    });
//
//    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
//    return totalPages;
//  } catch (error) {
//    console.error('Database Error:', error);
//    throw new Error('Failed to fetch total number of invoices.');
//  }
//}
//

export async function fetchInvoiceById(id: string) {
  //try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        id, // ObjectId string
      },
      select: {
        id: true,
        customerId: true,
        amount: true,
        status: true,
      },
    });

    if (!invoice) {
      notFound();
    }

    return {
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    };
  //} catch (error) {
   // console.error('Database Error:', error);
    //throw new Error('Failed to fetch invoice.');
 // }
}


export async function fetchCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    console.log(customers);
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

//native driverla daha kolay
//export async function fetchFilteredCustomers(query: string) {
export const fetchFilteredCustomers = cache(async (query: string) => {
  try {
    const customers = mongodb.collection('Customer');  
    const data = await customers.aggregate([
     {
    $match: {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    },
  },
  {
    $lookup: {
      from: 'Invoice',
      localField: '_id',
      foreignField: 'customerId',
      as: 'invoices',
    },
  },
  {
    $addFields: {
      total_invoices: { $size: '$invoices' },
      total_pending: {
        $sum: {
          $map: {
            input: '$invoices',
            as: 'inv',
            in: {
              $cond: [
                { $eq: ['$$inv.status', 'pending'] },
                '$$inv.amount',
                0,
              ],
            },
          },
        },
      },
      total_paid: {
        $sum: {
          $map: {
            input: '$invoices',
            as: 'inv',
            in: {
              $cond: [
                { $eq: ['$$inv.status', 'paid'] },
                '$$inv.amount',
                0,
              ],
            },
          },
        },
      },
    },
  },
  {
    $project: {
      invoices: 0,
    },
  },
  { $sort: { name: 1 } },
    ]).toArray();
   return data.map((c) => ({
  id: c._id.toString(),
  name: c.name,
  email: c.email,
  image_url: c.image_url ?? '',
  total_invoices: c.total_invoices ?? 0,
  total_pending: formatCurrency(c.total_pending) ?? 0,
  total_paid: formatCurrency(c.total_paid) ?? 0,
}));

  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
					   ); 
