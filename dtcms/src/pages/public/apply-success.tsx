import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ApplySuccess() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-success" />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
        Application Submitted!
      </h1>
      
      <p className="text-lg text-muted-foreground text-center max-w-md mb-8">
        Thank you for applying to join DTCMS. Your application is currently under review by our committee. We will contact you at the email or phone number provided once a decision has been made.
      </p>
      
      <div className="flex gap-4">
        <Link href="/">
          <Button variant="outline" size="lg" data-testid="btn-return-home">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}