import { FC, PointerEvent } from 'react';
import { localizeWithFallback } from '../../../../api';
import { LayoutAvatarImageView } from '../../../../common/layout/LayoutAvatarImageView';

export interface TouchChatPerson {
    name: string;
    figure: string;
}

interface ChatInputTouchPeopleViewProps {
    people: readonly TouchChatPerson[];
    whisperTarget: string;
    selectWhisperTarget: (name: string) => void;
    closeChat: () => void;
}

// Keeps the chat field focused, so the on-screen keyboard stays open while a face is tapped.
const keepFocus = (event: PointerEvent) => event.preventDefault();

/** Nearest room users first: tapping a face whispers to them, tapping it again goes back to talking to the room. */
export const ChatInputTouchPeopleView: FC<ChatInputTouchPeopleViewProps> = ({ people, whisperTarget, selectWhisperTarget, closeChat }) => (
    <div className="volt-touch-chat-modes">
        <span className="volt-touch-chat-people-label">
            {whisperTarget ? localizeWithFallback('widgets.chatinput.whisper.to', 'To') : localizeWithFallback('widgets.chatinput.button.whisper', 'Whisper')}
        </span>
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
                        onClick={() => selectWhisperTarget(selected ? '' : person.name)}
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
        <button aria-label={localizeWithFallback('generic.close', 'Close')} className="volt-touch-chat-close" type="button" onClick={closeChat} />
    </div>
);
