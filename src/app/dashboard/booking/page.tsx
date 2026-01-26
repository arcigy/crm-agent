import BookingTool from '@/tools/booking/page';

export const metadata = {
    title: 'Booking System | CRM',
    description: 'Vlastný scheduler typu Cal.com',
};

export default function BookingPage() {
    return <BookingTool />;
}
