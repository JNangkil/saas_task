import { Fragment, ReactElement, ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';

interface IFeaturesHighlightProps {
  image: ReactNode;
  title: ReactElement;
  description: string;
  more: { title: string; url: string };
  features: string[][];
}

const FeaturesHighlight = ({
  title,
  description,
  features,
  image,
  more,
}: IFeaturesHighlightProps) => {
  const renderItem = (cell: string, index: number) => {
    return (
      <div key={index} className="flex items-center gap-1.5 pe-7.5">
        <CircleCheck size={16} className="text-base text-green-500" />
        <span className="text-sm text-mono text-nowrap">{cell}</span>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="px-10 py-7.5 lg:pe-12.5 grow">
        <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-6 md:gap-10 p-2.5">
          <div className="flex flex-col items-start gap-3 md:max-w-[60%]">
            <CardTitle>{title}</CardTitle>
            <p className="text-sm font-normal text-secondary-foreground leading-5.5 mb-2.5">
              {description}
            </p>
            <div className="grid md:grid-cols-2 gap-2">
              {features.map((feature, index) => (
                <Fragment key={index}>
                  {feature.map((cell, cellIndex) => {
                    return renderItem(cell, cellIndex);
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          {image && <div className="shrink-0">{image}</div>}
        </div>
      </CardContent>
      {more && (
        <CardFooter className="justify-center mt-auto border-t border-border min-h-14">
          <Button mode="link" underlined="dashed" asChild>
            <Link to={more.url}>{more.title}</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export { FeaturesHighlight, type IFeaturesHighlightProps };
