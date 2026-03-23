import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LineChartComponent } from './line-chart.component';

describe('LineChartComponent', () => {
  let component: LineChartComponent;
  let fixture: ComponentFixture<LineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update chart with single dataset', () => {
    const testData = [
      { label: 'Day 1', value: 5 },
      { label: 'Day 2', value: 10 },
      { label: 'Day 3', value: 7 }
    ];

    component.data = testData;
    component.title = 'Activity Trend';
    component.ngOnChanges({
      data: { currentValue: testData, previousValue: undefined, firstChange: true },
      title: { currentValue: 'Activity Trend', previousValue: undefined, firstChange: true }
    });

    expect(component.chartData.labels).toEqual(['Day 1', 'Day 2', 'Day 3']);
    expect(component.chartData.datasets[0].data).toEqual([5, 10, 7]);
    expect(component.chartData.datasets[0].label).toBe('Activity Trend');
  });

  it('should update chart with multiple datasets', () => {
    const testDatasets = [
      { label: 'Created', data: [5, 10, 7], color: '#FF0000' },
      { label: 'Completed', data: [3, 8, 12], color: '#00FF00' }
    ];
    const testLabels = ['Day 1', 'Day 2', 'Day 3'];

    component.datasets = testDatasets;
    component.labels = testLabels;
    component.ngOnChanges({
      datasets: { currentValue: testDatasets, previousValue: undefined, firstChange: true },
      labels: { currentValue: testLabels, previousValue: undefined, firstChange: true }
    });

    expect(component.chartData.labels).toEqual(testLabels);
    expect(component.chartData.datasets).toHaveLength(2);
    expect(component.chartData.datasets[0].label).toBe('Created');
    expect(component.chartData.datasets[0].borderColor).toBe('#FF0000');
    expect(component.chartData.datasets[1].label).toBe('Completed');
    expect(component.chartData.datasets[1].borderColor).toBe('#00FF00');
  });

  it('should set axis labels', () => {
    component.yAxisLabel = 'Tasks';
    component.xAxisLabel = 'Date';
    component.ngOnChanges({
      yAxisLabel: { currentValue: 'Tasks', previousValue: undefined, firstChange: true },
      xAxisLabel: { currentValue: 'Date', previousValue: undefined, firstChange: true }
    });

    expect(component.chartOptions.scales?.y?.title?.display).toBe(true);
    expect(component.chartOptions.scales?.y?.title?.text).toBe('Tasks');
    expect(component.chartOptions.scales?.x?.title?.display).toBe(true);
    expect(component.chartOptions.scales?.x?.title?.text).toBe('Date');
  });

  it('should have correct chart type', () => {
    expect(component.chartType).toBe('line');
  });

  it('should have proper tension for smooth curves', () => {
    const testData = [
      { label: 'Day 1', value: 5 },
      { label: 'Day 2', value: 10 }
    ];

    component.data = testData;
    component.ngOnChanges({
      data: { currentValue: testData, previousValue: undefined, firstChange: true }
    });

    expect(component.chartData.datasets[0].tension).toBe(0.4);
  });
});