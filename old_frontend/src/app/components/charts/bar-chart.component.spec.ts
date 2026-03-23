import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarChartComponent } from './bar-chart.component';

describe('BarChartComponent', () => {
  let component: BarChartComponent;
  let fixture: ComponentFixture<BarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update chart with single dataset', () => {
    const testData = [
      { label: 'Task A', value: 10 },
      { label: 'Task B', value: 20 },
      { label: 'Task C', value: 15 }
    ];

    component.data = testData;
    component.title = 'Task Status';
    component.ngOnChanges({
      data: { currentValue: testData, previousValue: undefined, firstChange: true },
      title: { currentValue: 'Task Status', previousValue: undefined, firstChange: true }
    });

    expect(component.chartData.labels).toEqual(['Task A', 'Task B', 'Task C']);
    expect(component.chartData.datasets[0].data).toEqual([10, 20, 15]);
    expect(component.chartData.datasets[0].label).toBe('Task Status');
  });

  it('should update chart with multiple datasets', () => {
    const testDatasets = [
      { label: 'Q1', data: [100, 150, 130], color: '#FF6384' },
      { label: 'Q2', data: [120, 170, 140], color: '#36A2EB' }
    ];
    const testLabels = ['Product A', 'Product B', 'Product C'];

    component.datasets = testDatasets;
    component.labels = testLabels;
    component.ngOnChanges({
      datasets: { currentValue: testDatasets, previousValue: undefined, firstChange: true },
      labels: { currentValue: testLabels, previousValue: undefined, firstChange: true }
    });

    expect(component.chartData.labels).toEqual(testLabels);
    expect(component.chartData.datasets).toHaveLength(2);
    expect(component.chartData.datasets[0].label).toBe('Q1');
    expect(component.chartData.datasets[0].backgroundColor).toBe('#FF6384');
    expect(component.chartData.datasets[1].label).toBe('Q2');
    expect(component.chartData.datasets[1].backgroundColor).toBe('#36A2EB');
  });

  it('should support horizontal orientation', () => {
    component.horizontal = true;
    component.ngOnChanges({
      horizontal: { currentValue: true, previousValue: false, firstChange: true }
    });

    expect(component.chartOptions.indexAxis).toBe('y');
  });

  it('should set axis labels', () => {
    component.yAxisLabel = 'Count';
    component.xAxisLabel = 'Category';
    component.ngOnChanges({
      yAxisLabel: { currentValue: 'Count', previousValue: undefined, firstChange: true },
      xAxisLabel: { currentValue: 'Category', previousValue: undefined, firstChange: true }
    });

    expect(component.chartOptions.scales?.y?.title?.display).toBe(true);
    expect(component.chartOptions.scales?.y?.title?.text).toBe('Count');
    expect(component.chartOptions.scales?.x?.title?.display).toBe(true);
    expect(component.chartOptions.scales?.x?.title?.text).toBe('Category');
  });

  it('should have correct chart type', () => {
    expect(component.chartType).toBe('bar');
  });

  it('should apply border radius to bars', () => {
    const testData = [{ label: 'Task A', value: 10 }];
    component.data = testData;
    component.ngOnChanges({
      data: { currentValue: testData, previousValue: undefined, firstChange: true }
    });

    expect(component.chartData.datasets[0].borderRadius).toBe(4);
  });

  it('should swap axis labels for horizontal chart', () => {
    component.horizontal = true;
    component.yAxisLabel = 'Categories';
    component.xAxisLabel = 'Values';
    component.ngOnChanges({
      horizontal: { currentValue: true, previousValue: false, firstChange: true },
      yAxisLabel: { currentValue: 'Categories', previousValue: undefined, firstChange: true },
      xAxisLabel: { currentValue: 'Values', previousValue: undefined, firstChange: true }
    });

    expect(component.chartOptions.scales?.x?.title?.text).toBe('Categories');
    expect(component.chartOptions.scales?.y?.title?.text).toBe('Values');
  });
});