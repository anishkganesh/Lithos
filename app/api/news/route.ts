import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get query parameters
    const url = new URL(request.url);
    const commodity = url.searchParams.get('commodity');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Build query
    let query = supabase
      .from('quotemedia_news')
      .select('*')
      .order('datetime', { ascending: false })
      .limit(limit);

    // Apply filters
    if (commodity) {
      query = query.eq('primary_commodity', commodity);
    }

    if (search) {
      query = query.or(`headline.ilike.%${search}%,company_name.ilike.%${search}%,symbol.ilike.%${search}%`);
    }

    const { data: news, error } = await query;

    if (error) {
      console.error('Error fetching news:', error);
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }

    return NextResponse.json({ news: news || [] });
  } catch (error) {
    console.error('Error in news API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}