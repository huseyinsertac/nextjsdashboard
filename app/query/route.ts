import client from '../lib/mongodb';

const mongodb = client.db('dashboard');

async function listInvoices() {
  const invoices = mongodb.collection('Invoice'); // Prisma uses model name

  const data = await invoices
    .aggregate([
      {
        $match: { amount: 666 },
      },
      {
        $lookup: {
          from: 'Customer',           // collection name
          localField: 'customerId',   // field in invoices
          foreignField: '_id',         // field in customers
          as: 'customer',
        },
      },
      {
        $unwind: '$customer',
      },
      {
        $project: {
          _id: 0,
          amount: 1,
          name: '$customer.name',
        },
      },
    ])
    .toArray();

  return data;
}

export async function GET() {
  try {
    return Response.json(await listInvoices());
  } catch (error) {
    console.error(error);
    return Response.json({ error }, { status: 500 });
  }
}

