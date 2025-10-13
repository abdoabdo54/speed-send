'use client';

import React, { useState, Dispatch, SetStateAction } from 'react';
import { ChevronRight, Building, User as UserIcon } from 'lucide-react'; // Renamed to avoid conflict
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Define the User type right here to make the component self-contained and fix the error
interface User {
  id: string;
  name: string;
  email: string;
}

interface Account {
  id: string;
  name: string;
  users: User[];
}

interface UserSelectorProps {
  accounts: Account[];
  onUserSelect: Dispatch<SetStateAction<User | null>>;
}

export function UserSelector({ accounts, onUserSelect }: UserSelectorProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([accounts[0]?.id || '']);
  const [selectedUsers, setSelectedUsers] = useState<{ [key: string]: boolean }>({});

  const toggleAccount = (id: string) => {
    setExpandedAccounts((prev) =>
      prev.includes(id) ? prev.filter((accId) => accId !== id) : [...prev, id]
    );
  };

  const handleUserSelect = (user: User) => {
    const newSelectedUsers = {[user.id]: !selectedUsers[user.id]};
    setSelectedUsers(newSelectedUsers);
    // Pass the selected user object to the parent
    onUserSelect(user);
  }
  
  const handleSelectAll = (users: User[]) => {
    const allSelected = users.every(u => selectedUsers[u.id]);
    const newSelectedUsers = {...selectedUsers};
    users.forEach(u => newSelectedUsers[u.id] = !allSelected);
    setSelectedUsers(newSelectedUsers);
    // This is a simplified interaction; a real implementation might need to handle multiple selections.
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 space-y-4">
      <h3 className="text-lg font-bold text-gray-900">User & Account Selection</h3>
      
      <div>
        <label htmlFor="draftsPerUser" className="text-sm font-medium text-gray-700 block mb-2">Drafts per user</label>
        <Input id="draftsPerUser" type="number" defaultValue={1} min={1} className="w-full" />
      </div>

      <div className="space-y-2">
        {accounts.map((account) => (
          <div key={account.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleAccount(account.id)}
              className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-gray-500" />
                <span className="font-semibold text-gray-800">{account.name}</span>
              </div>
              <ChevronRight
                className={cn('h-5 w-5 text-gray-500 transition-transform', {
                  'rotate-90': expandedAccounts.includes(account.id),
                })}
              />
            </button>
            {expandedAccounts.includes(account.id) && (
              <div className="p-3 border-t">
                <div className="flex items-center justify-between mb-3">
                    <label htmlFor={`select-all-${account.id}`} className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
                        <Checkbox id={`select-all-${account.id}`} onCheckedChange={() => handleSelectAll(account.users)} checked={account.users.length > 0 && account.users.every(u => selectedUsers[u.id])} />
                        Select All
                    </label>
                </div>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {account.users.map((user) => (
                    <li key={user.id}>
                      <label htmlFor={`user-${user.id}`} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                        <Checkbox id={`user-${user.id}`} onCheckedChange={() => handleUserSelect(user)} checked={!!selectedUsers[user.id]} />
                        <div className="flex-grow">
                          <p className="font-medium text-gray-800">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
