"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeStorage } from '@/lib/safe-storage';

interface Company {
    id: number;
    name: string;
    tin: string;
    address: string;
    phoneNumber: string;
    email: string;
    smsSender: string;
    website: string;
    helpDeskPhoneNumber: string;
    isActive: boolean;
}

interface CompanyContextType {
    company: Company | null;
    setCompany: (company: Company | null) => void;
    isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get company data from safeStorage
        const userData = safeStorage.getItem('user-data');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (user.company) {
                    setCompany(user.company);
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
        setIsLoading(false);
    }, []);

    return (
        <CompanyContext.Provider value={{ company, setCompany, isLoading }}>
            {children}
        </CompanyContext.Provider>
    );
}

export function useCompany() {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
} 