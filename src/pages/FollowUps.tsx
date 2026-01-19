"use client"

import { useMemo, useState, useEffect } from "react"
import { format, parseISO, isToday, isTomorrow, differenceInDays } from "date-fns"
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  AlertCircle,
  Eye,
  Check,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import MainLayout from "@/components/layout/MainLayout"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { fetchFollowUps, updateFollowUp, deleteFollowUp } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

interface FollowUp {
  id: string
  leadId: string
  leadName: string
  leadPhone?: string
  leadEmail?: string
  scheduledFor: string | Date
  reason: string
  type: "call" | "email" | "sms" | "whatsapp"
  status: "pending" | "completed" | "missed" | "cancelled"
  notes: string
  createdByName: string
  outcome?: string
  completedAt?: string
  completedNotes?: string
}

const getFollowUpIcon = (type: string) => {
  switch (type) {
    case "call":
      return <Phone className="w-4 h-4" />
    case "email":
      return <Mail className="w-4 h-4" />
    case "sms":
      return <MessageSquare className="w-4 h-4" />
    case "whatsapp":
      return <MessageSquare className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500">Completed</Badge>
    case "pending":
      return <Badge className="bg-blue-500">Pending</Badge>
    case "missed":
      return <Badge className="bg-red-500">Missed</Badge>
    case "cancelled":
      return <Badge className="bg-gray-500">Cancelled</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

const formatFollowUpDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    return format(dateObj, "MMM d, yyyy h:mm a")
  } catch (error) {
    return "Invalid Date"
  }
}

const getDateLabel = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date
  if (isToday(dateObj)) {
    return "Today"
  } else if (isTomorrow(dateObj)) {
    return "Tomorrow"
  } else {
    return format(dateObj, "PPP")
  }
}

const FollowUps = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [expandedDates, setExpandedDates] = useState(new Set<string>())
  const { user } = useAuth()
  const { toast } = useToast()

  const groupedFollowUps = useMemo(() => {
    return followUps.reduce((acc, fu) => {
      const dateLabel = getDateLabel(fu.scheduledFor)
      if (!acc[dateLabel]) {
        acc[dateLabel] = []
      }
      acc[dateLabel].push(fu)
      return acc
    }, {} as { [key: string]: FollowUp[] })
  }, [followUps])

  useEffect(() => {
    loadFollowUps()
  }, [])

  const loadFollowUps = async () => {
    try {
      setLoading(true)
      const data = await fetchFollowUps()

      if (!data || !Array.isArray(data)) {
        setFollowUps([])
        return
      }

      // Transform the data to match the FollowUp interface
      const transformedData = data.map((fu: any) => ({
        id: fu.id || fu._id || "",
        leadId: typeof fu.leadId === "object" ? fu.leadId._id || fu.leadId : fu.leadId || "",
        leadName: fu.leadName || "Unknown Lead",
        leadPhone: fu.leadPhone || "",
        leadEmail: fu.leadEmail || "",
        scheduledFor: fu.scheduledFor || new Date().toISOString(),
        reason: fu.reason || "Follow-up",
        type: fu.type || "call",
        status: fu.status || "pending",
        notes: fu.notes || "",
        createdByName: fu.createdByName || "Admin",
        outcome: fu.outcome,
        completedAt: fu.completedAt,
        completedNotes: fu.completedNotes,
      }))

      setFollowUps(transformedData)
    } catch (error) {
      console.error("[v0] Error fetching follow-ups:", error)
      toast({ title: "Error", description: "Failed to load follow-ups", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Filter follow-ups based on search and filters
  const filteredFollowUps = followUps.filter((fu) => {
    const matchesSearch =
      !searchTerm ||
      fu.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fu.leadPhone?.includes(searchTerm) ||
      fu.leadEmail?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || fu.status === statusFilter
    const matchesType = typeFilter === "all" || fu.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const handleCompleteFollowUp = async (followUp: FollowUp) => {
    try {
      await updateFollowUp(followUp.id, { status: "completed" })
      await loadFollowUps()
      toast({ title: "Success", description: "Follow-up marked as completed" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to update follow-up", variant: "destructive" })
    }
  }

  const handleDeleteFollowUp = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this follow-up?")) {
      try {
        await deleteFollowUp(id)
        await loadFollowUps()
        toast({ title: "Success", description: "Follow-up deleted successfully" })
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete follow-up", variant: "destructive" })
      }
    }
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Follow-ups</h1>
          <p className="text-gray-600">All your follow-up tasks in one place</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="col-span-1 md:col-span-2"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400 animate-spin" />
              <p className="text-gray-600">Loading follow-ups...</p>
            </CardContent>
          </Card>
        ) : followUps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">No follow-ups yet</p>
            </CardContent>
          </Card>
        ) : filteredFollowUps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">No follow-ups match your filters</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFollowUps.map((followUp) => (
                  <TableRow key={followUp.id}>
                    <TableCell className="font-medium">{followUp.leadName}</TableCell>
                    <TableCell>{followUp.leadPhone || followUp.leadEmail}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFollowUpIcon(followUp.type)}
                        <span className="capitalize">{followUp.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{followUp.reason}</TableCell>
                    <TableCell>{formatFollowUpDate(followUp.scheduledFor)}</TableCell>
                    <TableCell>{getStatusBadge(followUp.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFollowUp(followUp)
                            setShowDetailDialog(true)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {followUp.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompleteFollowUp(followUp)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFollowUp(followUp.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedFollowUp && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Follow-up Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Lead</p>
                <p className="text-base font-semibold">{selectedFollowUp.leadName}</p>
                {selectedFollowUp.leadPhone && <p className="text-sm text-gray-600">{selectedFollowUp.leadPhone}</p>}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled For</p>
                <p className="text-base">
                  {format(parseISO(String(selectedFollowUp.scheduledFor)), "PPP p")}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Type</p>
                <Badge className="capitalize">{selectedFollowUp.type}</Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                {getStatusBadge(selectedFollowUp.status)}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Reason</p>
                <p className="text-base">{selectedFollowUp.reason}</p>
              </div>

              {selectedFollowUp.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Notes</p>
                  <p className="text-base text-gray-700">{selectedFollowUp.notes}</p>
                </div>
              )}

              {selectedFollowUp.completedNotes && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Notes</p>
                  <p className="text-base text-gray-700">{selectedFollowUp.completedNotes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedFollowUp.status === "pending" && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleCompleteFollowUp(selectedFollowUp)
                      setShowDetailDialog(false)
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                <Button variant="destructive" className="flex-1" onClick={() => {
                  handleDeleteFollowUp(selectedFollowUp.id)
                  setShowDetailDialog(false)
                }}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  )
}

export default FollowUps
