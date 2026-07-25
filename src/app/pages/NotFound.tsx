import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-lg">
        <div className="relative inline-block">
          <h1 className="text-[8rem] font-bold leading-none text-muted-foreground/10">404</h1>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold whitespace-nowrap">
            Faqja nuk u gjet
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          Kërkojmë ndjesë, por faqja që po kërkoni nuk ekziston ose është zhvendosur në një adresë tjetër.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button onClick={() => navigate('/')} className="h-11 px-6 rounded-xl">
            <Home className="w-4 h-4 mr-2" /> Ballina
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)} className="h-11 px-6 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kthehu mbrapsht
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
