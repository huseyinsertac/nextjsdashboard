'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '../lib/prisma';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),}
);

const CreateInvoice = FormSchema.omit({ date: true });
const UpdateInvoice = FormSchema.omit({ date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
export async function createInvoice(prevState: State, formData: FormData) {
const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString();
  try {
  await prisma.invoice.create({
  data: {
    customerId,          // must be ObjectId string
    amount: amountInCents,
    status,
    date,
  },
});
  } catch(error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

revalidatePath('/dashboard/invoices');
redirect('/dashboard/invoices');
}



//export async function updateInvoice(prevState: State, formData: FormData) {
//  const validatedFields = UpdateInvoice.safeParse({
//    customerId: formData.get('customerId'),
//    id: formData.get('id'),
//    amount: formData.get('amount'),
//    status: formData.get('status'),
//  });
//
//  if (!validatedFields.success) {
//    return {
//      errors: validatedFields.error.flatten().fieldErrors,
//      message: 'Missing Fields. Failed to Create Invoice.',
//    };
//  }
//
//  const { customerId, id, amount, status } = validatedFields.data;
//  const amountInCents = amount * 100;
//
//  await prisma.invoice.update({
//  where: {
//    id, // ObjectId string
//  },
//  data: {
//    customerId,
//    amount: amountInCents,
//    status,
//  },
//});
//
//  revalidatePath('/dashboard/invoices');
//  redirect('/dashboard/invoices');
//}


export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
): Promise<State> {

  await prisma.invoice.update({
    where: { id },
    data: {
      customerId: formData.get('customerId') as string,
      amount: Number(formData.get('amount')),
      status: formData.get('status') as 'paid' | 'pending',
    },
  });

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}



export async function deleteInvoice(id: string) {
  await prisma.invoice.delete({
  where: {
    id, // ObjectId string
  },
});
  revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
