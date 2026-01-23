'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string;
  label: string;
}

export function CountdownTimer({ targetDate, label }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        timeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return timeLeft;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-slate-800/80 rounded-md w-12 h-14 flex items-center justify-center border border-slate-700 shadow-inner">
        <span className="text-3xl font-black text-white font-mono">{value.toString().padStart(2, '0')}</span>
      </div>
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">{label}</span>
    </div>
  );

  return (
    <Card className="bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden group border-b-4 border-b-primary">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold border border-primary/30">
            T-MINUS
          </div>
        </div>
        <div className="flex justify-between gap-1">
          <TimeUnit value={timeLeft.days} label="Days" />
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <TimeUnit value={timeLeft.minutes} label="Mins" />
          <TimeUnit value={timeLeft.seconds} label="Secs" />
        </div>
      </CardContent>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
    </Card>
  );
}
