import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { PaintList, PaintFilters, PaintDetailModal } from '../components/paints';
import { useAuth } from '../hooks/useAuth';
import { useInventory } from '../hooks/useInventory';
import { usePaints } from '../hooks/usePaints';
import type { Paint } from '../types/paint';

type TabValue = 'all' | 'owned';

export function PaintsPage() {
  const { user } = useAuth();
  const {
    ownedPaintIds,
    isLoading: inventoryLoading,
    isOwned,
    toggleOwnership,
    isPending,
  } = useInventory();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  // Modal state
  const [selectedPaint, setSelectedPaint] = useState<Paint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePaintClick = (paint: Paint) => {
    setSelectedPaint(paint);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Get paints with filters
  const {
    paints,
    brands,
    isLoading: paintsLoading,
    totalCount,
    filteredCount,
  } = usePaints({
    searchQuery,
    brandFilter,
    ownedOnly: activeTab === 'owned',
    ownedPaintIds,
  });

  // Only block on inventory loading for "My Paints" tab (which filters by ownership)
  // "All Paints" tab can render immediately once paints are loaded
  const isLoading = paintsLoading || (activeTab === 'owned' && inventoryLoading);

  // Stats for display
  const ownedCount = ownedPaintIds.size;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900">HobbyTracker</h1>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                Home
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="sm">
                {user?.displayName || user?.email || 'Profile'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page title and stats */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Paint Inventory</h2>
          <p className="mt-1 text-sm text-gray-500">
            {ownedCount} of {totalCount} paints in your collection
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex gap-6" aria-label="Paint views">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`
                border-b-2 py-3 text-sm font-medium transition-colors
                ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              All Paints
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {totalCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('owned')}
              className={`
                border-b-2 py-3 text-sm font-medium transition-colors
                ${
                  activeTab === 'owned'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              My Paints
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                {ownedCount}
              </span>
            </button>
          </nav>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Card.Body>
            <PaintFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              brandFilter={brandFilter}
              onBrandChange={setBrandFilter}
              brands={brands}
            />
          </Card.Body>
        </Card>

        {/* Results count */}
        {(searchQuery || brandFilter) && (
          <p className="mb-4 text-sm text-gray-500">
            Showing {filteredCount} {filteredCount === 1 ? 'paint' : 'paints'}
            {brandFilter &&
              ` from ${brandFilter
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')}`}
          </p>
        )}

        {/* Paint list */}
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            <p className="mt-2 text-gray-500">Loading paints...</p>
          </div>
        ) : (
          <PaintList
            paints={paints}
            isOwned={isOwned}
            isPending={isPending}
            onToggleOwnership={toggleOwnership}
            onPaintClick={handlePaintClick}
            emptyMessage={
              activeTab === 'owned'
                ? 'No paints in your collection yet. Browse All Paints to add some!'
                : 'No paints match your search criteria'
            }
          />
        )}

        {/* Paint Detail Modal */}
        <PaintDetailModal
          paint={selectedPaint}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          isOwned={selectedPaint ? isOwned(selectedPaint.id) : false}
          isPending={selectedPaint ? isPending(selectedPaint.id) : false}
          onToggleOwnership={() => {
            if (selectedPaint) {
              toggleOwnership(selectedPaint.id);
            }
          }}
        />
      </main>
    </div>
  );
}
