import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type WorkspaceBillingSummary = {
  planName: string;
  seatsUsed: number;
  seatsTotal: number;
  nextInvoiceDate: string;
  paymentMethod: string;
};

@Component({
  selector: 'tf-workspace-billing-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workspace-billing-summary.component.html',
  styleUrls: ['./workspace-billing-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceBillingSummaryComponent {
  @Input({ required: true }) summary!: WorkspaceBillingSummary;
}
