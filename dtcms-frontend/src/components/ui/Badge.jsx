const STATUS_STYLES = {
  SCHEDULED: 'bg-secondary text-white',
  DEPARTED: 'bg-warning text-white',
  COMPLETED: 'bg-success text-white',
  CANCELLED: 'bg-danger text-white',
  CONFIRMED: 'bg-success text-white',
  NO_SHOW: 'bg-danger text-white',
  PAID: 'bg-success text-white',
  REFUNDED: 'bg-warning text-white',
  PENDING: 'bg-warning text-white',
  APPROVED: 'bg-success text-white',
  REJECTED: 'bg-danger text-white',
  ACTIVE: 'bg-success text-white',
  SUSPENDED: 'bg-warning text-white',
  EXPIRED: 'bg-danger text-white',
  INACTIVE: 'bg-danger text-white',
};

export default function Badge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-accent text-primary';

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}
