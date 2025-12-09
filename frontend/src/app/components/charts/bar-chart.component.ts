import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-bar-chart',
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
export class BarChartComponent implements OnChanges {
  @Input() data: { label: string; value: number }[] = [];
  @Input() datasets: { label: string; data: number[]; color?: string }[] = [];
  @Input() labels: string[] = [];
  @Input() width: number = 600;
  @Input() height: number = 300;
  @Input() title?: string;
  @Input() yAxisLabel?: string;
  @Input() xAxisLabel?: string;
  @Input() horizontal: boolean = false;

  public chartType: ChartType = 'bar';
  public chartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };
  public chartOptions: ChartConfiguration['options'] = {
    responsive: false,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
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
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: !!this.xAxisLabel,
          text: this.xAxisLabel || '',
          font: {
            size: 14
          }
        },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        title: {
          display: !!this.yAxisLabel,
          text: this.yAxisLabel || '',
          font: {
            size: 14
          }
        },
        beginAtZero: true,
        grid: {
          borderDash: [5, 5]
        }
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['datasets'] || changes['labels'] || changes['title'] ||
        changes['yAxisLabel'] || changes['xAxisLabel'] || changes['horizontal']) {
      this.updateChartData();
      this.updateChartOptions();
    }
  }

  private updateChartData(): void {
    // Handle single dataset input (data property)
    if (this.data.length > 0 && this.datasets.length === 0) {
      this.datasets = [{
        label: this.title || 'Data',
        data: this.data.map(d => d.value),
        color: '#36A2EB'
      }];
      this.labels = this.data.map(d => d.label);
    }

    const colors = [
      '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    this.chartData = {
      labels: this.labels,
      datasets: this.datasets.map((dataset, i) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.color || colors[i % colors.length],
        borderColor: dataset.color || colors[i % colors.length],
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
      }))
    };
  }

  private updateChartOptions(): void {
    const indexAxis = this.horizontal ? 'y' as const : 'x' as const;

    this.chartOptions = {
      ...this.chartOptions,
      indexAxis,
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
      },
      scales: {
        x: {
          display: true,
          title: {
            display: !this.horizontal && !!this.xAxisLabel,
            text: this.xAxisLabel || '',
            font: {
              size: 14
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          display: true,
          title: {
            display: this.horizontal && !!this.yAxisLabel || !this.horizontal && !!this.yAxisLabel,
            text: this.yAxisLabel || '',
            font: {
              size: 14
            }
          },
          beginAtZero: true,
          grid: {
            borderDash: [5, 5]
          }
        }
      }
    };

    // Swap labels for horizontal chart
    if (this.horizontal) {
      this.chartOptions.scales.x.title.display = !!this.yAxisLabel;
      this.chartOptions.scales.x.title.text = this.yAxisLabel || '';
      this.chartOptions.scales.y.title.display = !!this.xAxisLabel;
      this.chartOptions.scales.y.title.text = this.xAxisLabel || '';
    }
  }
}