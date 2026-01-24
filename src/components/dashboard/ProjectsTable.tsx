'use client';

import * as React from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
} from '@tanstack/react-table';
import {
    ChevronDown,
    MoreHorizontal,
    Plus,
    Search,
    Filter,
    FolderKanban,
    Calendar,
    User,
    X,
    Loader2,
    Check,
    Download,
} from 'lucide-react';
import Link from 'next/link';
import { Project, PROJECT_STAGES, PROJECT_TYPES, ProjectStage } from '@/types/project';
import { createProject, updateProjectStage, deleteProject } from '@/app/actions/projects';
import { ContactDetailModal } from './ContactDetailModal';
import { Lead } from '@/types/contact';

const columnHelper = createColumnHelper<Project>();

// CSV Export Helper
const exportToCSV = (data: Project[]) => {
    const headers = ['ID', 'Dátum vytvorenia', 'Typ projektu', 'Kontakt', 'Štádium', 'Dátum ukončenia'];
    const rows = data.map(p => [
        p.id,
        new Date(p.date_created).toLocaleDateString(),
        p.project_type,
        p.contact_name || 'N/A',
        PROJECT_STAGES.find(s => s.value === p.stage)?.label || p.stage,
        p.end_date || 'N/A'
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `projekty_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Stage Badge Component
function StageBadge({
    stage,
    projectId,
    onStageChange
}: {
    stage: ProjectStage;
    projectId: number;
    onStageChange: (id: number, stage: ProjectStage) => Promise<void>;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const stageInfo = PROJECT_STAGES.find(s => s.value === stage) || PROJECT_STAGES[0];

    const handleChange = async (newStage: ProjectStage) => {
        setLoading(true);
        await onStageChange(projectId, newStage);
        setLoading(false);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border transition-all ${stageInfo.color}`}
            >
                {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : stageInfo.label}
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 min-w-[160px]">
                        {PROJECT_STAGES.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => handleChange(s.value)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${stage === s.value ? 'font-bold' : ''}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${s.color.split(' ')[0]}`} />
                                {s.label}
                                {stage === s.value && <Check className="w-3 h-3 ml-auto text-blue-500" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Create Project Modal
function CreateProjectModal({
    isOpen,
    onClose,
    onSubmit,
    contacts
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    contacts: Lead[];
}) {
    const [loading, setLoading] = React.useState(false);
    const [formData, setFormData] = React.useState({
        project_type: PROJECT_TYPES[0],
        contact_id: '',
        stage: 'planning' as ProjectStage,
        end_date: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
                end_date: formData.end_date || null,
            });
            onClose();
            setFormData({
                project_type: PROJECT_TYPES[0],
                contact_id: '',
                stage: 'planning',
                end_date: '',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">Nový projekt</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Typ projektu</label>
                        <select
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={formData.project_type}
                            onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                        >
                            {PROJECT_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Kontakt</label>
                        <select
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={formData.contact_id}
                            onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                        >
                            <option value="">-- Bez kontaktu --</option>
                            {contacts.map((c) => (
                                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Štádium</label>
                        <select
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={formData.stage}
                            onChange={(e) => setFormData({ ...formData, stage: e.target.value as ProjectStage })}
                        >
                            {PROJECT_STAGES.map((stage) => (
                                <option key={stage.value} value={stage.value}>{stage.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Dátum ukončenia</label>
                        <input
                            type="date"
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Zrušiť
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg disabled:opacity-50 active:scale-95"
                        >
                            {loading ? 'Vytváranie...' : 'Vytvoriť projekt'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface ProjectsTableProps {
    data: Project[];
    contacts: Lead[];
}

export function ProjectsTable({ data, contacts }: ProjectsTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [projects, setProjects] = React.useState(data);
    const [fullDetailContact, setFullDetailContact] = React.useState<Lead | null>(null);

    React.useEffect(() => {
        setProjects(data);
    }, [data]);

    const handleStageChange = async (projectId: number, newStage: ProjectStage) => {
        // Optimistic update
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, stage: newStage } : p
        ));
        await updateProjectStage(projectId, newStage);
    };

    const handleCreate = async (formData: any) => {
        await createProject(formData);
        // Page will revalidate from server action
    };

    const columns = [
        columnHelper.accessor('date_created', {
            header: 'Dátum vytvorenia',
            cell: (info) => {
                const dateVal = info.getValue();
                const d = new Date(dateVal);
                const isoDate = d.toISOString().split('T')[0];
                return (
                    <Link
                        href={`/dashboard/calendar?date=${isoDate}`}
                        className="flex items-center gap-1.5 text-xs group/date hover:text-blue-600 transition-colors"
                    >
                        <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover/date:text-blue-400" />
                        <span className="font-medium text-gray-700 group-hover/date:text-blue-700 hover:underline">
                            {d.toLocaleDateString('sk-SK', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </span>
                    </Link>
                );
            },
        }),
        columnHelper.accessor('project_type', {
            header: 'Typ projektu',
            cell: (info) => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <FolderKanban className="w-3 h-3 text-indigo-600" />
                    </div>
                    <span className="font-bold text-gray-900 text-xs">{info.getValue()}</span>
                </div>
            ),
        }),
        columnHelper.accessor('contact_name', {
            header: 'Kontakt',
            cell: (info) => {
                const name = info.getValue();
                if (!name) return <span className="text-gray-300 text-sm italic">—</span>;

                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
                return (
                    <div
                        className="flex items-center gap-2 cursor-pointer group/contact"
                        onClick={() => {
                            const contact = contacts.find(c => String(c.id) === String(info.row.original.contact_id));
                            if (contact) {
                                setFullDetailContact(contact);
                            }
                        }}
                    >
                        <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                            {initials}
                        </div>
                        <span className="text-xs font-bold text-gray-700 group-hover/contact:text-blue-600 transition-colors">{name}</span>
                    </div>
                );
            },
        }),
        columnHelper.accessor('stage', {
            header: 'Štádium',
            cell: (info) => (
                <StageBadge
                    stage={info.getValue()}
                    projectId={info.row.original.id}
                    onStageChange={handleStageChange}
                />
            ),
        }),
        columnHelper.accessor('end_date', {
            header: 'Dátum ukončenia',
            cell: (info) => {
                const dateValue = info.getValue();
                if (!dateValue) return <span className="text-gray-300 text-sm italic">—</span>;

                const d = new Date(dateValue);
                const isoDate = d.toISOString().split('T')[0];
                const isOverdue = d < new Date() && info.row.original.stage !== 'completed';

                return (
                    <Link
                        href={`/dashboard/calendar?date=${isoDate}`}
                        className={`flex items-center gap-2 text-sm group/date transition-colors ${isOverdue ? 'text-red-600' : 'text-gray-700 hover:text-blue-600'}`}
                    >
                        <Calendar className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-gray-400 group-hover/date:text-blue-400'}`} />
                        <span className="font-medium hover:underline">
                            {d.toLocaleDateString('sk-SK', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </span>
                        {isOverdue && <span className="text-[10px] font-black text-red-500 uppercase">Meškanie!</span>}
                    </Link>
                );
            },
        }),
    ];

    const table = useReactTable({
        data: projects,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <>
            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreate}
                contacts={contacts}
            />

            <ContactDetailModal
                contact={fullDetailContact}
                isOpen={!!fullDetailContact}
                onClose={() => setFullDetailContact(null)}
            />

            <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Nový
                        </button>
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Hľadať projekty..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none transition-all w-64 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <button
                            onClick={() => exportToCSV(projects)}
                            className="text-gray-600 hover:bg-gray-100 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-gray-100 bg-white"
                        >
                            <Download className="w-3.5 h-3.5 text-gray-400" />
                            Export
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {projects.length} projektov
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-100">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <div className="flex items-center gap-1.5 leading-none">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <ChevronDown className="w-2.5 h-2.5 opacity-40" />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="w-12 p-4" />
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-20">
                                        <FolderKanban className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="text-gray-400 font-medium">Žiadne projekty</p>
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                                        >
                                            Vytvoriť prvý projekt
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-4 py-1.5 text-xs">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                        <td className="px-4 py-1.5 text-right">
                                            <button className="p-1 hover:bg-gray-100 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                                                <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
