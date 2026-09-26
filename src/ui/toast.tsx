import { create } from 'zustand';

const useToastStore = create<{ msg?: string; key: number }>(() => ({ key: 0 }));
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string) {
  clearTimeout(timer);
  useToastStore.setState((s) => ({ msg, key: s.key + 1 }));
  timer = setTimeout(() => useToastStore.setState({ msg: undefined }), 2400);
}

export function Toaster() {
  const { msg, key } = useToastStore();
  return msg ? (
    <div className="toast" role="status" key={key}>
      {msg}
    </div>
  ) : null;
}
