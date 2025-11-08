'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Mail,
  Settings,
  Activity,
  Building2,
  Contact,
  BarChart3,
  FileEdit,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Accounts', href: '/accounts', icon: Building2 },
  { name: 'Contacts', href: '/contacts', icon: Contact },
  { name: 'Campaigns', href: '/campaigns', icon: Mail },
  { name: 'Drafts', href: '/drafts', icon: FileEdit },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Reports', href: '/reports', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className={cn("flex h-screen flex-col border-r bg-card transition-all", collapsed ? "w-16" : "w-64") }>
      <div className="flex h-16 items-center border-b px-3 justify-between">
        <h1 className={cn("font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", collapsed ? "text-sm" : "text-xl") }>
          {collapsed ? 'SS' : 'Speed-Send'}
        </h1>
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground text-xs">{collapsed ? '›' : '‹'}</button>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href === '/' ? pathname === '/' : true);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        {!collapsed && (
          <>
            <p className="text-xs text-muted-foreground">Speed-Send v2.0 Pro</p>
            <p className="text-xs text-muted-foreground mt-1">PowerMTA Mode ⚡</p>
          </>
        )}
      </div>
    </div>
  );
}
