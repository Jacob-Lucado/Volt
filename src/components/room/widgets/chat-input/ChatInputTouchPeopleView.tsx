import { FC, PointerEvent } from 'react';
import { LayoutAvatarImageView } from '../../../../common/layout/LayoutAvatarImageView';

export interface TouchChatPerson {
    name: string;
    figure: string;
}

interface ChatInputTouchPeopleViewProps {
    people: readonly TouchChatPerson[];
    whisperTarget: string;
    selectWhisperTarget: (name: string) => void;
}

// Keeps the chat field focused, so the on-screen keyboard stays open while a face is tapped.
const keepFocus = (event: PointerEvent) => event.preventDefault();

/** Nearest room users first; tapping a face picks who the whisper goes to. */
export const ChatInputTouchPeopleView: FC<ChatInputTouchPeopleViewProps> = ({ people, whisperTarget, selectWhisperTarget }) => (
    <div className="volt-touch-chat-people" role="radiogroup">
        {people.map((person) => {
            const selected = person.name === whisperTarget;

            return (
                <button
                    key={person.name}
                    aria-checked={selected}
                    className={`volt-touch-chat-person${selected ? ' is-selected' : ''}`}
                    role="radio"
                    type="button"
                    onPointerDown={keepFocus}
                    onClick={() => selectWhisperTarget(person.name)}
                >
                    <LayoutAvatarImageView
                        className="volt-touch-chat-person-face"
                        figure={person.figure}
                        headOnly
                        compactHead
                        compactHeadSize={28}
                        compactHeadPadding={0}
                        direction={2}
                    />
                    <span className="volt-touch-chat-person-name">{person.name}</span>
                </button>
            );
        })}
    </div>
);
