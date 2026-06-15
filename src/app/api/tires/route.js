import { NextResponse } from 'next/server'
import tiresData from '@/data/tires.json'

export async function GET() {
  return NextResponse.json({
    success: true,
    count:   tiresData.tires.length,
    tires:   tiresData.tires,
  })
}
