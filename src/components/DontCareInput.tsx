import { MintermInput } from './MintermInput';

interface DontCareInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function DontCareInput(props: DontCareInputProps) {
  return <MintermInput id="dont-cares" label="Don't cares" symbol="d( )" {...props} />;
}
