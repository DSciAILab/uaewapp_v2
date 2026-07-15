'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ListTodo, Clock, Play, CheckCircle, AlertTriangle, Search, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TaskTable } from '@/components/tasks/task-table';
import { TaskForm } from '@/components/tasks/task-form';
import { TaskTemplateForm } from '@/components/tasks/task-template-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventTask, TaskTemplate, TaskFilters, TaskStatus, TaskPriority, TaskCategory, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_CATEGORY_LABELS } from '@/types/task';
import { getEventTasks, getTaskStats, getTaskTemplates } from '@/lib/services/task-service';

export default function TasksPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [editingTask, setEditingTask] = useState<EventTask | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0, by_category: {} as Record<string, number> });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksData, statsData, templatesData] = await Promise.all([
        getEventTasks(eventId, filters),
        getTaskStats(eventId),
        getTaskTemplates(),
      ]);
      setTasks(tasksData);
      setStats(statsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (task: EventTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setIsTemplateFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleTemplateFormClose = () => {
    setIsTemplateFormOpen(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations & Tasks</h1>
          <p className="text-muted-foreground">Manage operational tasks, checklists and templates</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'templates' ? (
            <Button onClick={() => setIsTemplateFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />New Template
            </Button>
          ) : (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />New Task
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />Tasks
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <span className="text-2xl font-bold">{stats.pending}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{stats.in_progress}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">{stats.completed}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-2xl font-bold">{stats.overdue}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    className="pl-8"
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? undefined : v as TaskStatus })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.priority || 'all'}
                    onValueChange={(v) => setFilters({ ...filters, priority: v === 'all' ? undefined : v as TaskPriority })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.category || 'all'}
                    onValueChange={(v) => setFilters({ ...filters, category: v === 'all' ? undefined : v as TaskCategory })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Category</SelectItem>
                      {Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <TaskTable tasks={tasks} onEdit={handleEdit} onRefresh={loadData} />
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:border-primary transition-colors cursor-pointer" onClick={() => handleEditTemplate(template)}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline">{TASK_CATEGORY_LABELS[template.category]}</Badge>
                    {!template.is_active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {template.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{template.checklist_items.length} checklist items</span>
                    <span>{template.estimated_duration_minutes || '?'} mins</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                No templates found. Create one to standardise event tasks.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <TaskForm
        eventId={eventId}
        task={editingTask}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={loadData}
      />

      <TaskTemplateForm
        template={editingTemplate}
        open={isTemplateFormOpen}
        onOpenChange={handleTemplateFormClose}
        onSuccess={loadData}
      />
    </div>
  );
}

