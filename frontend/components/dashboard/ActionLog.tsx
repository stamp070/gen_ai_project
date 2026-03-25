import React, { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionLogProps {
    logs: string[];
    streaming?: boolean;
}

export function ActionLog({ logs, streaming = true }: ActionLogProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (streaming && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs, streaming]);

    const getColorForPhase = (text: string) => {
        if (text.includes('[GOAL]') || text.includes('[GOVERNANCE]')) return 'text-[var(--color-success)]';
        if (text.includes('[REASON]') && text.includes('Risk=high')) return 'text-[var(--color-high)]';
        if (text.includes('[REASON]') && text.includes('critical')) return 'text-[var(--color-critical)]';
        if (text.includes('APPROVED')) return 'text-[var(--color-success)] font-bold';
        if (text.includes('[EXECUTE]')) return 'text-[var(--color-primary)]';
        if (text.includes('[PLAN]')) return 'text-purple-400';
        return 'text-gray-300';
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2 border-b border-gray-800">
                <div className="flex justify-between items-center">
                    <CardTitle>Action Log</CardTitle>
                    {streaming && (
                        <span className="flex items-center gap-2 text-xs text-[var(--color-primary)] animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
                            Streaming
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent
                className="flex-1 overflow-y-auto p-4 bg-[#0A0E1A] font-mono text-sm"
            >
                <div ref={containerRef} className="h-full">
                <div className="space-y-2">
                    <AnimatePresence>
                        {logs.map((log, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`${getColorForPhase(log)} py-1 border-b border-gray-800/50 last:border-0`}
                            >
                                {log}
                            </motion.div>
                        ))}
                        {logs.length === 0 && (
                            <div className="text-gray-600 italic">Waiting for agent loop to start...</div>
                        )}
                    </AnimatePresence>
                </div>
                </div>
            </CardContent>
        </Card>
    );
}
