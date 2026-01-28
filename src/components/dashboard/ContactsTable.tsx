'use client';

import * as React from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
    getGroupedRowModel,
    GroupingState,
    getExpandedRowModel,
    getFilteredRowModel,
} from '@tanstack/react-table';
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToFirstScrollableAncestor, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Lead } from '@/types/contact';
import { updateContact } from '@/app/actions/contacts';

import { CreateContactModal } from './contacts/CreateContactModal';
import { ContactImportModal } from './ContactImportModal';
import { GoogleImportModal } from './GoogleImportModal';
import { PhoneQrModal } from './contacts/PhoneQrModal';
import { ActivityDetailModal } from './contacts/ActivityDetailModal';
import { ContactDetailModal } from './ContactDetailModal';
import { ContactProjectsModal } from './contacts/ContactProjectsModal';
import { EditableComment } from './contacts/EditableComment';
import { FlagBadge } from './contacts/FlagBadge';
import { ContactsTableToolbar } from './contacts/ContactsTableToolbar';
import { DraggableRow } from './contacts/DraggableRow';
import { GroupHeader } from './contacts/GroupHeader';
import { EmptyStateActions } from './ContactActionButtons';

const columnHelper = createColumnHelper<Lead>();

const columns = [
    columnHelper.accessor('first_name', {
        id: 'contact',
        header: 'Contact',
        cell: (info) => {
            const fn = info.row.original.first_name || '';
            const ln = info.row.original.last_name || '';
            const initials = (fn[0] || '') + (ln[0] || '');
            return (
                <div
                    className="flex items-center gap-2 cursor-pointer group/name"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-contact-detail', { detail: info.row.original }));
                    }}
                >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 shadow-sm transition-transform group-hover/name:scale-110">
                        {initials.toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-900 group-hover/name:text-blue-600 transition-colors leading-none text-xs">{fn} {ln}</span>
                </div>
            );
        },
    }),
    columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => (
            <a href={`mailto:${info.getValue()}`} className="text-blue-600 hover:underline text-xs leading-none">
                {info.getValue()}
            </a>
        ),
    }),
    columnHelper.accessor('phone', {
        header: 'Phone',
        cell: (info) => {
            const phone = info.getValue();
            return phone ? (
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-qr', { detail: phone }))}
                    className="flex items-center gap-2 group hover:bg-gray-50 px-2 py-1 rounded-md transition-all border border-transparent hover:border-gray-200"
                >
                    <FlagBadge phone={phone} />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{phone}</span>
                </button>
            ) : <span className="text-gray-400 text-xs">-</span>
        }
    }),
    columnHelper.accessor('company', {
        header: 'Account',
        cell: (info) => info.getValue() || <span className="text-gray-400 text-xs">-</span>
    }),
    columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        enableHiding: true,
    }),
    columnHelper.accessor('comments', {
        header: 'Comments',
        cell: (info) => (
            <EditableComment
                id={info.row.original.id}
                initialValue={info.getValue() || ''}
            />
        )
    }),
];

export function ContactsTable({ data, onCreate }: { data: Lead[], onCreate?: (data: any) => Promise<any> }) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [grouping, setGrouping] = React.useState<GroupingState>(['status']);
    const [globalFilter, setGlobalFilter] = React.useState('');
    const [isMounted, setIsMounted] = React.useState(false);

    // Modal states
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [modalMode, setModalMode] = React.useState<'form' | 'json'>('form');
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
    const [qrPhone, setQrPhone] = React.useState<string | null>(null);
    const [detailContact, setDetailContact] = React.useState<Lead | null>(null);
    const [fullDetailContact, setFullDetailContact] = React.useState<Lead | null>(null);
    const [projectsContact, setProjectsContact] = React.useState<Lead | null>(null);
    const [isGoogleImportOpen, setIsGoogleImportOpen] = React.useState(false);

    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor));

    React.useEffect(() => {
        setIsMounted(true);
        const handleOpenQr = (e: any) => setQrPhone(e.detail);
        const handleOpenDetail = (e: any) => setDetailContact(e.detail);
        const handleOpenFullDetail = (e: any) => setFullDetailContact(e.detail);
        const handleOpenProjects = (e: any) => setProjectsContact(e.detail);
        const handleOpenCreate = (e: any) => { setModalMode(e.detail || 'form'); setIsModalOpen(true); };
        const handleOpenImport = () => setIsImportModalOpen(true);
        const handleOpenGoogleImport = () => setIsGoogleImportOpen(true);

        window.addEventListener('open-qr', handleOpenQr);
        window.addEventListener('open-activity-detail', handleOpenDetail);
        window.addEventListener('open-contact-detail', handleOpenFullDetail);
        window.addEventListener('open-project-detail', handleOpenProjects);
        window.addEventListener('open-create-contact', handleOpenCreate);
        window.addEventListener('open-import-contact', handleOpenImport);
        window.addEventListener('open-import-google', handleOpenGoogleImport);

        return () => {
            window.removeEventListener('open-qr', handleOpenQr);
            window.removeEventListener('open-activity-detail', handleOpenDetail);
            window.removeEventListener('open-contact-detail', handleOpenFullDetail);
            window.removeEventListener('open-project-detail', handleOpenProjects);
            window.removeEventListener('open-create-contact', handleOpenCreate);
            window.removeEventListener('open-import-contact', handleOpenImport);
            window.removeEventListener('open-import-google', handleOpenGoogleImport);
        };
    }, []);

    const table = useReactTable({
        data, columns,
        state: { sorting, grouping, globalFilter },
        onSortingChange: setSorting,
        onGroupingChange: setGrouping,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getGroupedRowModel: getGroupedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: { expanded: true, columnVisibility: { status: false } },
    });

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        const contact = activeData?.contact as Lead;

        // 1. Handle Group Drop (Status Change)
        if (overData?.type === 'group') {
            const targetStatus = overData.status as string;
            if (contact && targetStatus && contact.status !== targetStatus) {
                const promise = updateContact(contact.id, { status: targetStatus });
                toast.promise(promise, {
                    loading: 'Updating contact status...',
                    success: 'Status updated successfully',
                    error: (err) => 'Failed to update status: ' + err.message
                });
                await promise;
                window.location.reload();
                return;
            }
        }

        // 2. Handle Row-to-Row Drop (Manual Reordering)
        if (active.id !== over.id && overData?.type === 'row') {
            const overContact = overData.contact as Lead;

            // If dragging between groups, we can still change status if they are in different groups
            if (contact.status !== overContact.status) {
                const promise = updateContact(contact.id, { status: overContact.status });
                await promise;
            }

            // In a real app we would update the `sort_order` in the DB
            // Here we just notify the user it would work with a proper DB schema
            toast.info('Sorting saved (Simulated)');
            window.location.reload();
        }
    };

    if (!isMounted) return <div className="p-20 text-center font-bold text-gray-300">INITIALIZING ENGINE...</div>;

    return (
        <DndContext sensors={sensors} modifiers={[restrictToFirstScrollableAncestor]} onDragEnd={handleDragEnd}>
            <CreateContactModal isOpen={isModalOpen} initialMode={modalMode} onClose={() => setIsModalOpen(false)} onSubmit={async (d) => { if (onCreate) await onCreate(d); }} />
            <ContactImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={() => window.location.reload()} />
            <GoogleImportModal isOpen={isGoogleImportOpen} onClose={() => setIsGoogleImportOpen(false)} />
            <PhoneQrModal phone={qrPhone} onClose={() => setQrPhone(null)} />
            <ActivityDetailModal contact={detailContact} onClose={() => setDetailContact(null)} />
            <ContactDetailModal contact={fullDetailContact} isOpen={!!fullDetailContact} onClose={() => setFullDetailContact(null)} />
            <ContactProjectsModal contact={projectsContact} onClose={() => setProjectsContact(null)} />

            {data.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center bg-white rounded-[4rem] border border-gray-100 p-24 text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />
                    <h3 className="text-3xl font-black text-gray-900 mb-4 uppercase italic tracking-tight">V databáze nie sú žiadne kontakty</h3>
                    <EmptyStateActions />
                </div>
            ) : (
                <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <ContactsTableToolbar globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} totalCount={data.length} onNewClick={() => setIsModalOpen(true)} onImportClick={() => setIsImportModalOpen(true)} />
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        <th className="w-10 p-2" /><th className="w-8 p-2" />
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100 last:border-0 hover:bg-gray-200 cursor-pointer transition-colors relative group">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        ))}
                                        <th className="w-10 p-2 border-l border-gray-100 text-center"><Plus className="w-4 h-4 text-gray-400 mx-auto" /></th>
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <SortableContext
                                    items={table.getRowModel().rows.filter(r => !r.getIsGrouped()).map(r => `row-${r.original.id}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {table.getRowModel().rows.map(row => (
                                        row.getIsGrouped() ?
                                            <GroupHeader key={row.id} row={row} columnsCount={columns.length} /> :
                                            <DraggableRow key={row.id} row={row} />
                                    ))}
                                </SortableContext>
                            </tbody>
                        </table>
                        <div className="p-3 border-t border-gray-100 bg-gray-50/50 sticky bottom-0" onClick={() => setIsModalOpen(true)}>
                            <div className="flex items-center gap-2 text-gray-400 text-sm hover:text-blue-600 cursor-pointer font-medium group">
                                <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                                <span>Click to add a new contact...</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DndContext>
    );
}
