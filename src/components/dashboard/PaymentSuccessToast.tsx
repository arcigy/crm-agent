'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function PaymentSuccessToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful! You now have access.');
      // Remove the query param to clean up URL
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('success');
      newParams.delete('tool');
      router.replace(`/dashboard?${newParams.toString()}`);
    } else if (searchParams.get('canceled') === 'true') {
        toast.error('Payment canceled.');
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('canceled');
        router.replace(`/dashboard?${newParams.toString()}`);
    }
  }, [searchParams, router]);

  return null;
}
