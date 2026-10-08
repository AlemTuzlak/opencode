export type SetupGroup = {
    kind: 'serial';
    command: string;
} | {
    kind: 'parallel';
    commands: Array<string>;
};
export interface SetupBuilder {
    serial: (command: string) => void;
    parallel: (commands: Array<string>) => void;
}
export type SetupInput = Array<string> | ((builder: SetupBuilder) => void);
export declare function buildSetupPlan(input: SetupInput | undefined): Array<SetupGroup>;
