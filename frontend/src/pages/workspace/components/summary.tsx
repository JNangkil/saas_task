import {
  BriefcaseBusiness,
  Building,
  LucideIcon,
  MapPin,
  Globe,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ISummaryItem {
  icon: LucideIcon;
  info: string;
}
type ISummaryItems = Array<ISummaryItem>;

interface ISummaryProps {
  title: string;
}

const Summary = ({ title }: ISummaryProps) => {
  const items: ISummaryItems = [
    { icon: Building, info: 'Acme Corporation' },
    { icon: BriefcaseBusiness, info: 'SaaS Platform' },
    { icon: MapPin, info: 'San Francisco, CA' },
    { icon: Globe, info: 'https://acme.inc' },
  ];

  const renderItem = (item: ISummaryItem, index: number) => {
    return (
      <div key={index} className="flex items-center gap-2.5">
        <item.icon className="text-base text-muted-foreground" size={16} />
        <span className="text-sm leading-none text-mono">
          {item.info}
        </span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <p className="text-sm text-foreground leading-5.5 mb-4">
          Organize your organization's workspaces, manage member access, and oversee all cross-functional initiatives in one unified command center.
        </p>
        <div className="grid gap-y-5">
          {items.map((item, index) => {
            return renderItem(item, index);
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export { Summary, type ISummaryItem, type ISummaryItems, type ISummaryProps };
