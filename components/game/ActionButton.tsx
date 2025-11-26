/**
 * ActionButton Component
 *
 * Renders a button for a game action with metadata from the state machine.
 * Handles enabled/disabled states, variants, and displays reasons why an action is disabled.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionDescriptor, GameAction } from "@/lib/game/state-machine";

interface ActionButtonProps {
  actionDescriptor: ActionDescriptor<GameAction>;
  onClick: (action: GameAction) => void;
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
    <div className="space-y-2 w-full">
      <Button
        variant={mapVariant(variant)}
        size={size}
        disabled={!enabled || isLoading}
        onClick={() => onClick(action)}
        className={`w-full ${className || ''}`}
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
 * Supports custom renderers for specific action types.
 */

interface ActionButtonGroupProps {
  actions: ActionDescriptor<GameAction>[];
  onAction: (action: GameAction) => void;
  loadingAction?: string; // The action type currently loading
  layout?: 'grid' | 'flex';
  columns?: number; // For grid layout
  size?: "default" | "sm" | "lg" | "icon";
  showDisabledReasons?: boolean;
  className?: string;
  customRenderers?: Record<string, (actionDesc: ActionDescriptor<GameAction>, isLoading: boolean) => React.ReactNode>;
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
  customRenderers,
}: ActionButtonGroupProps) {
  if (actions.length === 0) {
    return null;
  }

  const gridClass = layout === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3';

  // Determine if a button should span 2 columns
  const shouldSpanTwo = (index: number, total: number) => {
    if (layout !== 'grid') return false;
    // If only 1 button, it should span 2 columns
    if (total === 1) return true;
    // If 3 buttons, the third button (index 2) should span 2 columns
    if (total === 3 && index === 2) return true;
    return false;
  };

  return (
    <div className={`${gridClass} ${className || ''}`}>
      {actions.map((actionDesc, index) => {
        const isLoading = loadingAction === actionDesc.action.type;
        const customRenderer = customRenderers?.[actionDesc.action.type];

        return (
          <div
            key={`${actionDesc.action.type}-${index}`}
            className={shouldSpanTwo(index, actions.length) ? 'col-span-2' : ''}
          >
            {customRenderer ? (
              customRenderer(actionDesc, isLoading)
            ) : (
              <ActionButton
                actionDescriptor={actionDesc}
                onClick={onAction}
                isLoading={isLoading}
                size={size}
                showDisabledReason={showDisabledReasons}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
