import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface IUsersItem {
  image: string;
}
type IUsersItems = Array<IUsersItem>;

interface IUsersProps {
  items: IUsersItem[];
  title: string;
}

const Users = ({ title, items }: IUsersProps) => {
  const renderItem = (item: IUsersItem, index: number) => {
    return (
      <img
        src={toAbsoluteUrl(`/media/avatars/${item.image}`)}
        className="rounded-full h-[36px]"
        alt="image"
        key={index}
      />
    );
  };

  return (
    <Card className="h-full flex flex-col items-stretch">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 grow flex items-center">
        <div className="flex flex-wrap gap-2.5 xl:me-16">
          {items.map((item, index) => {
            return renderItem(item, index);
          })}
        </div>
      </CardContent>
      <CardFooter className="justify-center mt-auto">
        <Button mode="link" underlined="dashed" asChild>
          <Link to="#">Invite Members</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export { Users, type IUsersItem, type IUsersItems, type IUsersProps };
