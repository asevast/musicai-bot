import { Badge, Cell } from '@telegram-apps/telegram-ui';
import { useCredits } from '../hooks/useCredits';

export function CreditsBadge(): JSX.Element {
  const { credits, isLoading } = useCredits();

  return (
    <Cell
      after={
        <Badge type="number" className="bg-blue-500 text-white">
          {isLoading ? '...' : credits}
        </Badge>
      }
    >
      Credits
    </Cell>
  );
}
