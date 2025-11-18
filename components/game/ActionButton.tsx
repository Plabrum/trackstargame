/**
 * ActionButton Component
 *
 * Renders a button for a game action with metadata from the state machine.
 * Handles enabled/disabled states, variants, and displays reasons why an action is disabled.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionDescriptor, HostAction, PlayerAction } from "@/lib/game/state-machine";

interface ActionButtonProps {
  actionDescriptor: ActionDescriptor<HostAction | PlayerAction>;
  onClick: (action: HostAction | PlayerAction) => void;
  isLoading?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showDisabledReason?: boolean; // Whether to show disabled reason below button
}

// Map action variant to button variant
function mapVariant(variant?: 'primary' | 'secondary' | 'danger') {
  switch (variant) {
    case 'primary':
      return 'default';
    case 'secondary':
      return 'secondary';
    case 'danger':
      return 'destructive';
    default:
      return 'default';
  }
}

export function ActionButton({
  actionDescriptor,
  onClick,
  isLoading,
  size = "default",
  className,
  showDisabledReason = true,
}: ActionButtonProps) {
  const { action, label, description, enabled, disabledReason, variant } = actionDescriptor;

  return (
    <div className="space-y-2">
      <Button
        variant={mapVariant(variant)}
        size={size}
        disabled={!enabled || isLoading}
        onClick={() => onClick(action)}
        className={className}
        title={description} // Native browser tooltip for description
      >
        {isLoading ? 'Loading...' : label}
      </Button>

      {/* Show disabled reason if present and showDisabledReason is true */}
      {!enabled && disabledReason && showDisabledReason && (
        <Alert variant="default" className="text-sm py-2">
          <AlertDescription className="text-muted-foreground">
            {disabledReason}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * ActionButtonGroup Component
 *
 * Renders a group of action buttons in a grid or flex layout.
 */

interface ActionButtonGroupProps {
  actions: ActionDescriptor<HostAction | PlayerAction>[];
  onAction: (action: HostAction | PlayerAction) => void;
  loadingAction?: string; // The action type currently loading
  layout?: 'grid' | 'flex';
  columns?: number; // For grid layout
  size?: "default" | "sm" | "lg" | "icon";
  showDisabledReasons?: boolean;
  className?: string;
}

export function ActionButtonGroup({
  actions,
  onAction,
  loadingAction,
  layout = 'flex',
  columns = 2,
  size = "default",
  showDisabledReasons = false,
  className,
}: ActionButtonGroupProps) {
  if (actions.length === 0) {
    return null;
  }

  const gridClass = layout === 'grid' ? `grid grid-cols-${columns} gap-3` : 'flex flex-col gap-3';

  return (
    <div className={`${gridClass} ${className || ''}`}>
      {actions.map((actionDesc, index) => (
        <ActionButton
          key={`${actionDesc.action.type}-${index}`}
          actionDescriptor={actionDesc}
          onClick={onAction}
          isLoading={loadingAction === actionDesc.action.type}
          size={size}
          showDisabledReason={showDisabledReasons}
        />
      ))}
    </div>
  );
}
