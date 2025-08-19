import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, Grid3X3, List, MapIcon, SlidersHorizontal, Clock, Percent, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import DealCard from '@/components/DealCard';

interface Deal {
  id: string;
  title: string;
  description: string;
  discount_pct: number;
  cashback_pct: number;
  end_at: string;
  start_at?: string;
  created_at?: string;
  grabs?: number;
  merchant_id: string;
  merchants: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category?: string;
  };
}

const Deals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('ending_soon');
  const [selectedRewardTypes, setSelectedRewardTypes] = useState<string[]>(['all']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [discountRange, setDiscountRange] = useState([0]);
  const [timeFilter, setTimeFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const now = new Date();

      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          merchants (
            id,
            name,
            address,
            latitude,
            longitude,
            category
          )
        `)
        .eq('is_active', true)
        .gt('end_at', now.toISOString()) // Only non-expired deals
        .order('end_at', { ascending: true });

      if (error) throw error;
      setDeals(data || []);
      setFilteredDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  useEffect(() => {
    let filtered = [...deals];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(deal => 
        deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.merchants.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (deal.description && deal.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Reward type filter
    if (!selectedRewardTypes.includes('all')) {
      filtered = filtered.filter(deal => {
        if (selectedRewardTypes.includes('discount') && deal.discount_pct > 0) return true;
        if (selectedRewardTypes.includes('cashback') && deal.cashback_pct > 0) return true;
        return false;
      });
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(deal => 
        selectedCategories.includes(deal.merchants.category || 'other')
      );
    }

    // Time filter
    if (timeFilter === 'ending_soon') {
      const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
      filtered = filtered.filter(deal => new Date(deal.end_at) <= sixHoursFromNow);
    }

    // Sort
    switch (sortBy) {
      case 'ending_soon':
        filtered.sort((a, b) => new Date(a.end_at).getTime() - new Date(b.end_at).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.grabs || 0) - (a.grabs || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.start_at || b.created_at).getTime() - new Date(a.start_at || a.created_at).getTime());
        break;
    }

    setFilteredDeals(filtered);
  }, [deals, searchTerm, selectedRewardTypes, selectedCategories, timeFilter, sortBy]);

  const getUniqueCategories = () => {
    const categories = new Set(deals.map(deal => deal.merchants.category || 'other'));
    return Array.from(categories);
  };

  const toggleRewardType = (type: string) => {
    if (type === 'all') {
      setSelectedRewardTypes(['all']);
    } else {
      const newTypes = selectedRewardTypes.filter(t => t !== 'all');
      if (newTypes.includes(type)) {
        const filtered = newTypes.filter(t => t !== type);
        setSelectedRewardTypes(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setSelectedRewardTypes([...newTypes, type]);
      }
    }
  };

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-muted rounded w-1/3"></div>
            <div className="h-16 bg-muted rounded"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Hero Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Great Deals Nearby</h1>
          <p className="text-muted-foreground">Discover amazing discounts and earn credits at local merchants</p>
        </div>

        {/* Search and Controls */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals or merchants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ending_soon">Ending Soon</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>

              {/* Filters */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {(selectedCategories.length > 0 || !selectedRewardTypes.includes('all') || timeFilter !== 'all') && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        {selectedCategories.length + (selectedRewardTypes.includes('all') ? 0 : selectedRewardTypes.length) + (timeFilter !== 'all' ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter Deals</SheetTitle>
                    <SheetDescription>Narrow down deals to find exactly what you want</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-6 mt-6">
                    {/* Reward Type */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Reward Type
                      </h4>
                      <div className="space-y-2">
                        {['all', 'discount', 'cashback'].map((type) => (
                          <label key={type} className="flex items-center space-x-2 cursor-pointer">
                            <Checkbox 
                              checked={selectedRewardTypes.includes(type)}
                              onCheckedChange={() => toggleRewardType(type)}
                            />
                            <span className="capitalize text-sm">{type === 'all' ? 'All Types' : type === 'cashback' ? 'Earn Credits' : 'Instant Discount'}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Categories */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Categories
                      </h4>
                      <div className="space-y-2">
                        {getUniqueCategories().map((category) => (
                          <label key={category} className="flex items-center space-x-2 cursor-pointer">
                            <Checkbox 
                              checked={selectedCategories.includes(category)}
                              onCheckedChange={() => toggleCategory(category)}
                            />
                            <span className="capitalize text-sm">{category}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Time Filter */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time Remaining
                      </h4>
                      <div className="space-y-2">
                        {['all', 'ending_soon'].map((time) => (
                          <label key={time} className="flex items-center space-x-2 cursor-pointer">
                            <Checkbox 
                              checked={timeFilter === time}
                              onCheckedChange={() => setTimeFilter(time)}
                            />
                            <span className="text-sm">{time === 'all' ? 'All Deals' : 'Ending Soon (6h)'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* View Toggle and Results Count */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
              </span>
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list' | 'map')}>
                <TabsList className="grid grid-cols-3 w-24">
                  <TabsTrigger value="grid" className="p-2">
                    <Grid3X3 className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="p-2">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="map" className="p-2">
                    <MapIcon className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Results */}
        <Tabs value={viewMode} className="w-full">
          <TabsContent value="grid" className="mt-0">
            {filteredDeals.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground mb-2">No deals found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="list" className="mt-0">
            {filteredDeals.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground mb-2">No deals found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-4">
                {filteredDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="map" className="mt-0">
            <div className="bg-muted rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Map view coming soon</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Deals;