import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import {
  WorkspaceBillingSummary,
  WorkspaceBillingSummaryComponent
} from '../../components/billing-summary/workspace-billing-summary.component';
import { WorkspaceStoreService } from '../../services/workspace-store.service';

type InvoiceRow = {
  id: string;
  amount: string;
  billingPeriod: string;
  status: 'paid' | 'due';
};

@Component({
  selector: 'tf-workspace-billing-page',
  standalone: true,
  imports: [CommonModule, WorkspaceBillingSummaryComponent],
  templateUrl: './workspace-billing-page.component.html',
  styleUrls: ['./workspace-billing-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceBillingPageComponent {
  private readonly workspaceStore = inject(WorkspaceStoreService);
  protected readonly activeWorkspace = toSignal(this.workspaceStore.observeWorkspace(), {
    initialValue: null
  });

  protected readonly billingSummary = computed<WorkspaceBillingSummary>(() => {
    const workspace = this.activeWorkspace();

    if (!workspace) {
      return {
        planName: 'Growth (trial)',
        seatsUsed: 0,
        seatsTotal: 5,
        nextInvoiceDate: '—',
        paymentMethod: 'Not configured'
      };
    }

    return {
      planName: `${workspace.name} growth`,
      seatsUsed: 5,
      seatsTotal: 10,
      nextInvoiceDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toLocaleDateString(),
      paymentMethod: 'Visa ••42'
    };
  });

  protected readonly upcomingInvoices: InvoiceRow[] = [
    {
      id: 'INV-2048',
      amount: '$180.00',
      billingPeriod: 'May 1 – May 31',
      status: 'paid'
    },
    {
      id: 'INV-2049',
      amount: '$210.00',
      billingPeriod: 'Jun 1 – Jun 30',
      status: 'due'
    }
  ];
}
