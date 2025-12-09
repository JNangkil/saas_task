import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="chart-container" [style.width.px]="width" [style.height.px]="height">
      <canvas baseChart [type]="chartType" [data]="chartData" [options]="chartOptions"></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      margin: auto;
    }
  `]
})
export class PieChartComponent implements OnChanges {
  @Input() data: { label: string; value: number; color?: string }[] = [];
  @Input() width: number = 300;
  @Input() height: number = 300;
  @Input() title?: string;

  public chartType: ChartType = 'pie';
  public chartData: ChartData<'pie'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };
  public chartOptions: ChartConfiguration['options'] = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: !!this.title,
        text: this.title,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['title']) {
      this.updateChartData();
      this.updateChartOptions();
    }
  }

  private updateChartData(): void {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    this.chartData = {
      labels: this.data.map(d => d.label),
      datasets: [
        {
          data: this.data.map(d => d.value),
          backgroundColor: this.data.map((d, i) => d.color || colors[i % colors.length]),
          borderWidth: 2,
          borderColor: '#fff'
        }
      ]
    };
  }

  private updateChartOptions(): void {
    this.chartOptions = {
      ...this.chartOptions,
      plugins: {
        ...this.chartOptions.plugins,
        title: {
          display: !!this.title,
          text: this.title || '',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        }
      }
    };
  }
}