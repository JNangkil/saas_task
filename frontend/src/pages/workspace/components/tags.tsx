import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ITagsItem {
  label: string;
}
type ITagsItems = Array<ITagsItem>;

interface ITagsProps {
  title: string;
  className?: string;
}

const Tags = ({ title, className }: ITagsProps) => {
  const items: ITagsItems = [
    { label: 'Scrum' },
    { label: 'Agile' },
    { label: 'Sprints' },
    { label: 'Kanban' },
    { label: 'Roadmaps' },
    { label: 'Planning' },
    { label: 'Bug Tracking' },
    { label: 'CI/CD' },
  ];

  const renderItem = (item: ITagsItem, index: number) => {
    return (
      <Badge key={index} variant="secondary">
        {item.label}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex flex-wrap gap-2.5 mb-2">
          {items.map((item, index) => {
            return renderItem(item, index);
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export { Tags, type ITagsItem, type ITagsItems, type ITagsProps };
