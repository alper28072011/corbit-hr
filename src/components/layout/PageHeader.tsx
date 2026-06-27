import React, { ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { can } from '../../lib/permissions';
import { cn } from '../../lib/utils';

export interface HeaderAction {
  key: string;
  isSeparator?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: string;
  onClick?: () => void;
  colorClass?: string;
  permissionKey?: string;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: HeaderAction[];
  // Keep children/custom actions support if needed for backward compatibility initially,
  // but we can just use children if really necessary. The prompt mostly focused on moving to `actions={...}` array.
  customActions?: ReactNode; 
}

export function PageHeader({ title, description, actions, customActions }: PageHeaderProps) {
  const { currentUser, rolesPermissions } = useStore();

  return (
    <div className="flex flex-col gap-2 pb-3 border-b border-stone-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2D332D]">{title}</h2>
          {description && (
            <p className="text-sm text-stone-500 mt-0.5">{description}</p>
          )}
        </div>
        
        {customActions && (
          <div className="flex items-center gap-2 shrink-0">
            {customActions}
          </div>
        )}
      </div>

      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center mt-1">
          {actions.map((action) => {
            // Check permission
            if (action.permissionKey && currentUser) {
              const hasPerm = can(currentUser.role, action.permissionKey, 'staff', rolesPermissions) || 
                              can(currentUser.role, action.permissionKey, 'room', rolesPermissions) ||
                              can(currentUser.role, action.permissionKey, 'maintenance', rolesPermissions) ||
                              can(currentUser.role, 'super_admin', 'settings', rolesPermissions); // super admin catch
              // Simple check: we just check if it's super_admin or we can look up all features.
              // To make sure, we could just let the caller handle permissions or we check in all pages.
              // Actually, `can` takes (role, featureKey, pageKey). It's hard to know which pageKey.
              // Let's just check across all modules or let the caller pass disabled/hidden if needed.
              // But if the prompt says `permissionKey`, let's check it simply by finding if the role has the feature.
            }

            // A more robust check without pageKey:
            let hasPermission = true;
            if (action.permissionKey && currentUser && currentUser.role !== 'super_admin') {
              const rolePerms = rolesPermissions.find(r => r.roleKey === currentUser.role);
              if (rolePerms) {
                 hasPermission = rolePerms.allowedFeatures.includes(action.permissionKey);
              } else {
                 hasPermission = false;
              }
            }

            if (!hasPermission) return null;

            if (action.isSeparator) {
              return <div key={action.key} className="w-px h-8 bg-stone-300 mx-2" />;
            }

            if (!action.icon || !action.onClick) return null;

            return (
              <div key={action.key} className="relative group">
                <button
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    "p-2.5 bg-white border border-stone-200 rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center",
                    action.disabled ? "opacity-50 cursor-not-allowed text-stone-400" : "cursor-pointer " + (action.colorClass || "text-stone-600 hover:text-[#7C8363] hover:bg-[#7C8363]/5 border-stone-200 hover:border-[#7C8363]/30")
                  )}
                  aria-label={action.tooltip}
                >
                  <action.icon className="w-5 h-5" />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2.5 py-1.5 bg-stone-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                  {action.tooltip}
                  {/* Triangle pointer */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-stone-800 rotate-45"></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
