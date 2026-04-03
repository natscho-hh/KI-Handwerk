import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Neuer Kunde</h2>
      <CustomerForm />
    </div>
  );
}
