import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { toAbsoluteUrl } from '@/lib/helpers';

export function WorkspaceGrid({ workspaces }: { workspaces: any[] }) {
  const defaultImages = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg'];
  const defaultAvatars = ['300-6.png', '300-5.png', '300-14.png', '300-11.png', '300-16.png', '300-1.png'];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-7.5">
      {workspaces.map((ws, i) => {
        const image = defaultImages[i % defaultImages.length];
        const avatar = defaultAvatars[i % defaultAvatars.length];
        return (
          <Card key={ws.id} className="border-0 shadow-sm shadow-black/8 flex flex-col items-stretch">
            <img
              src={toAbsoluteUrl(`/media/images/600x400/${image}`)}
              className="w-full h-auto rounded-t-xl object-cover aspect-[3/2]"
              alt="image"
            />
            <div className="card-border card-rounded-b flex flex-col gap-2 px-5 py-4.5">
              <Link
                to={`/app/${ws.id}`}
                className="text-lg font-medium text-mono hover:text-primary"
              >
                {ws.name}
              </Link>
              <p className="text-sm text-secondary-foreground line-clamp-1 min-h-[20px]">
                {ws.description || 'Manage projects and collaborate.'}
              </p>
              <div className="flex items-center justify-between grow mt-1">
                <div className="flex items-center grow">
                  <img
                    src={toAbsoluteUrl(`/media/avatars/${avatar}`)}
                    className="rounded-full size-7 me-2"
                    alt="image"
                  />
                  <span className="text-sm text-foreground">
                    Admin
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-md">
                    {new Date(ws.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
