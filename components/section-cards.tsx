import { TrendingUp, TrendingDown, Building2, FileText, Handshake, FolderOpen } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SectionCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-4 lg:px-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projects</CardTitle>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">2,847</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600 inline-flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5%
            </span>{' '}
            from last quarter
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Active mining projects tracked
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reporting Issuers</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">486</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600 inline-flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.2%
            </span>{' '}
            year over year
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Listed mining companies
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Filings</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">18,294</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600 inline-flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +23.1%
            </span>{' '}
            this month
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Technical reports & disclosures
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">M&A/JVs</CardTitle>
          <Handshake className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">142</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600 inline-flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +31.5%
            </span>{' '}
            vs last year
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Deals & joint ventures
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
