import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { HeaderAction } from '../components/layout/PageHeader';

export function usePageRefresh(): HeaderAction {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const triggerRefresh = useStore(state => state.triggerRefresh);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerRefresh();
    
    // Simulate a brief delay so the spinning animation is visible
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Veriler güncellendi');
    }, 1000);
  };

  return {
    key: 'refresh-data',
    icon: ({ className }) => (
      <RefreshCw className={`${className || ''} ${isRefreshing ? 'animate-spin' : ''}`} />
    ),
    tooltip: 'Verileri Yenile',
    onClick: handleRefresh
  };
}
