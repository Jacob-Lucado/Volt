import { GetSessionDataManager } from '@volt/renderer';
import { FC, Fragment, useEffect, useMemo, useState } from 'react';
import {
    IWiredNativeVariableDefinition,
    LocalizeText,
    createNativeVariableToken,
    resolveWiredStyle,
    sanitizeWiredContextMenuButtonId,
    sanitizeWiredContextMenuButtonText,
    tokenOfVariableSlot,
    UnreleasedWiredText,
    variableSlotOf,
    WIRED_VARIABLE_ABSENT,
    WiredContextMenuLimits,
    WiredContextMenuLayout,
    WiredContextMenuOperator,
    WiredContextMenuPetScope,
    WiredContextMenuTarget,
    WiredContextMenuUserScope,
    WiredFurniType
} from '../../../../api';
import { useWired, useWiredNativeVariables, useWiredTools } from '../../../../hooks';
import { WiredButtonRow } from '../WiredButtonRow';
import { WiredContextMenuTargetToggle } from '../WiredContextMenuTargetToggle';
import { WiredDropdown } from '../WiredDropdown';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredShellButton } from '../WiredShellHeaderView';
import { WiredText } from '../WiredText';
import { WiredTextInput } from '../WiredTextInput';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

interface ContextMenuCondition {
    token: string;
    operator: number;
    value: number;
}

const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

const { EXISTS, NOT_EXISTS } = WiredContextMenuOperator;
const OPERATOR_ORDER = [EXISTS, NOT_EXISTS, WiredContextMenuOperator.GREATER, WiredContextMenuOperator.GREATER_EQUAL, WiredContextMenuOperator.EQUAL,
    WiredContextMenuOperator.LESS_EQUAL, WiredContextMenuOperator.LESS, WiredContextMenuOperator.NOT_EQUAL];
const SYMBOLS: Record<number, string> = {
    [WiredContextMenuOperator.LESS]: '<',
    [WiredContextMenuOperator.EQUAL]: '=',
    [WiredContextMenuOperator.GREATER]: '>',
    [WiredContextMenuOperator.LESS_EQUAL]: '≤',
    [WiredContextMenuOperator.NOT_EQUAL]: '≠',
    [WiredContextMenuOperator.GREATER_EQUAL]: '≥'
};

const isPresence = (operator: number) => operator === EXISTS || operator === NOT_EXISTS;

const normalizeOperator = (operator: number) => (OPERATOR_ORDER.includes(operator as never) ? operator : EXISTS);

const presenceText = (operator: number, variable: string) =>
    LocalizeText(operator === EXISTS ? UnreleasedWiredText.CONDITION_EXISTS : UnreleasedWiredText.CONDITION_NOT_EXISTS, ['variable'], [variable]);

const operatorLabel = (operator: number) => (isPresence(operator) ? presenceText(operator, '').trim() : SYMBOLS[operator]);

const conditionLabel = (condition: ContextMenuCondition, name: string) =>
    isPresence(condition.operator) ? presenceText(condition.operator, name) : `${name} ${SYMBOLS[condition.operator]} ${condition.value}`;

const definitionOf = (definitions: IWiredNativeVariableDefinition[], token: string) =>
    definitions.find((definition) => createNativeVariableToken(definition.variableId) === token) ?? null;

const isConditionValid = (definitions: IWiredNativeVariableDefinition[], condition: ContextMenuCondition) => {
    if (!condition.token) return false;

    const definition = definitionOf(definitions, condition.token);

    return isPresence(condition.operator) || !definition || definition.hasValue;
};

const readConditions = (ints: number[], variableIds: string[], count: number, intOffset: number, variableOffset: number): ContextMenuCondition[] =>
    Array.from({ length: Math.min(WiredContextMenuLimits.CONDITIONS, Math.max(0, count)) }, (_, index) => ({
        token: tokenOfVariableSlot(variableIds[variableOffset + index]),
        operator: normalizeOperator(ints[intOffset + index * 2] ?? EXISTS),
        value: ints[intOffset + index * 2 + 1] ?? 0
    }));

const writeConditions = (conditions: ContextMenuCondition[]) =>
    Array.from({ length: WiredContextMenuLimits.CONDITIONS }, (_, index) => {
        const condition = conditions[index];

        return condition ? [condition.operator, isPresence(condition.operator) ? 0 : condition.value] : [EXISTS, 0];
    }).flat();

const conditionSlots = (conditions: ContextMenuCondition[]) =>
    Array.from({ length: WiredContextMenuLimits.CONDITIONS }, (_, index) => (conditions[index] ? variableSlotOf(conditions[index].token) : WIRED_VARIABLE_ABSENT));

const ConditionForm: FC<{ condition: ContextMenuCondition; definitions: IWiredNativeVariableDefinition[]; onChange: (condition: ContextMenuCondition) => void }> = ({ condition, definitions, onChange }) => {
    const presence = isPresence(condition.operator);
    const entries = useMemo(() => {
        const list = buildWiredVariablePickerEntries('user', presence ? 'condition' : 'change-reference', definitions);

        if (!condition.token || flattenWiredVariablePickerEntries(list).some((entry) => entry.token === condition.token)) return list;

        const fallback = createFallbackVariableEntry('user', condition.token);

        return fallback ? [fallback, ...list] : list;
    }, [condition.token, definitions, presence]);

    return (
        <div className="volt-wired__condition-form">
            <WiredVariablePicker entries={entries} recentScope="context-menu-condition" selectedToken={condition.token}
                onClear={() => onChange({ ...condition, token: '' })} onSelect={(entry) => onChange({ ...condition, token: entry.token })} />
            <div className="volt-wired__condition-form-row">
                <WiredDropdown options={OPERATOR_ORDER.map((operator) => ({ id: operator, label: operatorLabel(operator) }))} value={condition.operator}
                    onChange={(operator) => onChange({ ...condition, operator })} />
                {!presence && <WiredNumberInput max={INT_MAX} min={INT_MIN} value={condition.value} onChange={(value) => onChange({ ...condition, value })} />}
            </div>
        </div>
    );
};

const ConditionSection: FC<{ title: string; conditions: ContextMenuCondition[]; definitions: IWiredNativeVariableDefinition[]; onChange: (conditions: ContextMenuCondition[]) => void }> = ({ title, conditions, definitions, onChange }) => {
    const { trigger = null } = useWired();
    const { activeWiredStyle } = useWiredTools();
    const shellStyle = resolveWiredStyle(activeWiredStyle, GetSessionDataManager().getFloorItemData(trigger?.spriteId)?.className);
    const [expanded, setExpanded] = useState(-1);

    useEffect(() => setExpanded(-1), [trigger]);

    const nameOf = (token: string) => definitionOf(definitions, token)?.name ?? '...';

    const update = (index: number, condition: ContextMenuCondition) => onChange(conditions.map((entry, entryIndex) => (entryIndex === index ? condition : entry)));

    const remove = (index: number) => {
        onChange(conditions.filter((_, entryIndex) => entryIndex !== index));
        setExpanded(-1);
    };

    const add = () => {
        onChange([...conditions, { token: '', operator: EXISTS, value: 0 }]);
        setExpanded(conditions.length);
    };

    const count = LocalizeText(UnreleasedWiredText.CONDITION_COUNT, ['count', 'max'], [String(conditions.length), String(WiredContextMenuLimits.CONDITIONS)]);

    return (
        <WiredSection title={title} headerOptionsRight={<WiredText text={count} />}>
            <WiredText soft text={LocalizeText(UnreleasedWiredText.ALL_CONDITIONS_MUST_MATCH)} />
            {conditions.map((condition, index) => (
                <Fragment key={index}>
                    <div className="volt-wired__condition-row">
                        <WiredShellButton className="volt-wired__condition-label" shellStyle={shellStyle} onClick={() => setExpanded(expanded === index ? -1 : index)}>
                            {conditionLabel(condition, nameOf(condition.token))}
                        </WiredShellButton>
                        <WiredShellButton aria-label="X" className="volt-wired__condition-remove" shellStyle={shellStyle} onClick={() => remove(index)}>
                            <svg aria-hidden="true" height="9" viewBox="0 0 9 9" width="9"><path d="M1 1l7 7M8 1l-7 7" stroke="currentColor" strokeWidth="2" /></svg>
                        </WiredShellButton>
                    </div>
                    {expanded === index && <ConditionForm condition={condition} definitions={definitions} onChange={(next) => update(index, next)} />}
                </Fragment>
            ))}
            <WiredButtonRow buttons={[{ id: 'add', label: LocalizeText(UnreleasedWiredText.ADD_CONDITION), disabled: conditions.length >= WiredContextMenuLimits.CONDITIONS, onClick: add }]} />
        </WiredSection>
    );
};

/** `wf_xtra_context_menu_item`, a global add-on: text = button id TAB button text, 20 ints and 6 variables. */
export const WiredExtraContextMenuItemView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { userVariableDefinitions = [] } = useWiredNativeVariables();
    const [buttonId, setButtonId] = useState('');
    const [buttonText, setButtonText] = useState('');
    const [userOn, setUserOn] = useState(true);
    const [userScope, setUserScope] = useState<number>(WiredContextMenuUserScope.EVERYONE_EXCEPT_ME);
    const [petOn, setPetOn] = useState(false);
    const [petScope, setPetScope] = useState<number>(WiredContextMenuPetScope.ALL_PETS);
    const [botOn, setBotOn] = useState(false);
    const [visibility, setVisibility] = useState<ContextMenuCondition[]>([]);
    const [enable, setEnable] = useState<ContextMenuCondition[]>([]);

    useEffect(() => {
        if (!trigger) return;

        const ints = WiredContextMenuLayout.defaults.map((value, index) => trigger.intData?.[index] ?? value);
        const variableIds = trigger.variableIds ?? [];
        const text = trigger.stringData ?? '';
        const tab = text.indexOf('\t');

        setButtonId(sanitizeWiredContextMenuButtonId(tab < 0 ? text : text.slice(0, tab)));
        setButtonText(sanitizeWiredContextMenuButtonText(tab < 0 ? '' : text.slice(tab + 1)));
        setUserOn(ints[1] === 1);
        setUserScope(ints[2] >= WiredContextMenuUserScope.EVERYONE && ints[2] <= WiredContextMenuUserScope.ONLY_ME ? ints[2] : WiredContextMenuUserScope.EVERYONE_EXCEPT_ME);
        setPetOn(ints[3] === 1);
        setPetScope(ints[4] === WiredContextMenuPetScope.MY_PETS ? WiredContextMenuPetScope.MY_PETS : WiredContextMenuPetScope.ALL_PETS);
        setBotOn(ints[5] === 1);
        setVisibility(readConditions(ints, variableIds, ints[6], WiredContextMenuLayout.visibilityOffset, 0));
        setEnable(readConditions(ints, variableIds, ints[7], WiredContextMenuLayout.enableOffset, WiredContextMenuLimits.CONDITIONS));
    }, [trigger]);

    const validate = () =>
        (!buttonId.length || !!buttonText.trim().length) && [...visibility, ...enable].every((condition) => isConditionValid(userVariableDefinitions, condition));

    const save = () => {
        setIntParams([
            WiredContextMenuTarget.USERS, userOn ? 1 : 0, userScope, petOn ? 1 : 0, petScope, botOn ? 1 : 0, visibility.length, enable.length,
            ...writeConditions(visibility), ...writeConditions(enable)
        ]);
        setVariableIds([...conditionSlots(visibility), ...conditionSlots(enable)]);
        setStringParam(buttonId ? `${buttonId}\t${buttonText}` : '');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate}
            headerControls={<WiredContextMenuTargetToggle />}>
            <WiredSection title={LocalizeText(UnreleasedWiredText.BUTTON_ID)}>
                <WiredTextInput maxLength={WiredContextMenuLimits.BUTTON_ID_LENGTH} value={buttonId} onChange={(value) => setButtonId(sanitizeWiredContextMenuButtonId(value))} />
            </WiredSection>
            <WiredSection title={LocalizeText(UnreleasedWiredText.BUTTON_TEXT)}>
                <WiredTextInput maxLength={WiredContextMenuLimits.BUTTON_TEXT_LENGTH} value={buttonText} onChange={(value) => setButtonText(sanitizeWiredContextMenuButtonText(value))} />
            </WiredSection>
            <WiredSection title={LocalizeText(UnreleasedWiredText.USER_RESTRICTIONS)}>
                <div className="volt-wired__restrictions">
                    <WiredCheckboxOption checked={userOn} label={LocalizeText(UnreleasedWiredText.RESTRICTION_USER)} last={true} onChange={setUserOn} />
                    <WiredDropdown disabled={!userOn} value={userScope} onChange={setUserScope}
                        options={Object.values(WiredContextMenuUserScope).map((id) => ({ id, label: LocalizeText(`${UnreleasedWiredText.USER_SCOPE}${id}`) }))} />
                    <WiredCheckboxOption checked={petOn} label={LocalizeText(UnreleasedWiredText.RESTRICTION_PET)} last={true} onChange={setPetOn} />
                    <WiredDropdown disabled={!petOn} value={petScope} onChange={setPetScope}
                        options={Object.values(WiredContextMenuPetScope).map((id) => ({ id, label: LocalizeText(`${UnreleasedWiredText.PET_SCOPE}${id}`) }))} />
                    <WiredCheckboxOption checked={botOn} label={LocalizeText(UnreleasedWiredText.RESTRICTION_BOT)} last={true} onChange={setBotOn} />
                </div>
            </WiredSection>
            <ConditionSection conditions={visibility} definitions={userVariableDefinitions} title={LocalizeText(UnreleasedWiredText.VISIBILITY_CONDITION)} onChange={setVisibility} />
            <ConditionSection conditions={enable} definitions={userVariableDefinitions} title={LocalizeText(UnreleasedWiredText.ENABLE_CONDITION)} onChange={setEnable} />
        </WiredExtraBaseView>
    );
};
