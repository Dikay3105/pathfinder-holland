import * as React from 'react';
import { Check, ChevronDown, PencilLine, Search, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { viCommandFilter } from '@/lib/textSearch';
import { cn } from '@/lib/utils';

export const OTHER_VALUE = '__other__';

interface SearchableSelectProps {
  id?: string;
  /** Tiêu đề hiển thị trên bottom sheet (mobile) */
  title: string;
  options: string[];
  /** Tên đang chọn; '' nếu chưa chọn */
  value: string;
  /** true khi người dùng chọn "Khác" */
  isOther?: boolean;
  onSelect: (value: string, isOther: boolean) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Hiện mục "Khác (tự nhập)" ở cuối danh sách */
  allowOther?: boolean;
  otherLabel?: string;
  loading?: boolean;
  invalid?: boolean;
}

/**
 * Ô chọn có tìm kiếm (không dấu).
 * - Desktop: popover dưới ô chọn.
 * - Mobile: bottom sheet cao 85% màn hình, ô tìm kiếm ghim trên cùng, mục chạm lớn.
 */
export function SearchableSelect({
  id,
  title,
  options,
  value,
  isOther = false,
  onSelect,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  allowOther = false,
  otherLabel = 'Khác (tự nhập)',
  loading = false,
  invalid = false,
}: SearchableSelectProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const handleSelect = (val: string, other: boolean) => {
    onSelect(val, other);
    setOpen(false);
  };

  const display = isOther ? otherLabel : value;

  const trigger = (
    <button
      id={id}
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-invalid={invalid || undefined}
      onClick={() => setOpen(true)}
      className={cn(
        'flex h-12 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-left text-base',
        'ring-offset-background transition-colors hover:bg-accent/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        invalid ? 'border-destructive' : 'border-input',
      )}
    >
      <span className={cn('min-w-0 flex-1 truncate', !display && 'text-muted-foreground')}>
        {display || placeholder}
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
    </button>
  );

  const list = (
    <Command filter={viCommandFilter} className="bg-transparent">
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="h-4 w-4 shrink-0 opacity-50" />
        <CommandPrimitive.Input
          value={search}
          onValueChange={setSearch}
          placeholder={searchPlaceholder}
          // 16px để iOS không tự zoom khi focus
          className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button
            type="button"
            aria-label="Xoá tìm kiếm"
            onClick={() => setSearch('')}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <CommandList
        className={cn(
          'overscroll-contain',
          isMobile ? 'max-h-none flex-1' : 'max-h-[320px]',
        )}
      >
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Đang tải danh sách...</div>
        ) : (
          <>
            <CommandEmpty className="px-4 py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy.
              {allowOther && ' Chọn "Khác" bên dưới để tự nhập.'}
            </CommandEmpty>
            <CommandGroup>
              {options.map(opt => {
                const selected = !isOther && opt === value;
                return (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => handleSelect(opt, false)}
                    className={cn(
                      'cursor-pointer gap-2 rounded-md text-base',
                      isMobile ? 'min-h-12 px-3 py-3' : 'px-3 py-2',
                      selected && 'font-medium text-primary',
                    )}
                  >
                    <Check className={cn('h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                    <span className="leading-snug">{opt}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
      {allowOther && (
        // Luôn hiển thị, không bị bộ lọc ẩn đi
        <div className="border-t p-2">
          <button
            type="button"
            onClick={() => handleSelect('', true)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 text-left text-base hover:bg-accent',
              isMobile ? 'min-h-12 py-3' : 'py-2',
              isOther && 'font-medium text-primary',
            )}
          >
            <PencilLine className="h-4 w-4 shrink-0" />
            {otherLabel}
          </button>
        </div>
      )}
    </Command>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
          <DrawerContent className="flex h-[85dvh] flex-col">
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] [&_[cmdk-root]]:flex [&_[cmdk-root]]:min-h-0 [&_[cmdk-root]]:flex-1 [&_[cmdk-root]]:flex-col">
              {list}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={e => {
          // focus ô tìm kiếm thay vì nội dung popover
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector('input')?.focus();
        }}
      >
        {list}
      </PopoverContent>
    </Popover>
  );
}
