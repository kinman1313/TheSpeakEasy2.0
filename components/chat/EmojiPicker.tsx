"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface EmojiPickerProps {
    onSelectEmoji: (emoji: string) => void;
    onClose: () => void;
}

const emojiCategories = {
    'Smileys': [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
        '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
        '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
        '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
        '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐'
    ],
    'Hearts': [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
        '💘', '💝', '💟', '♥️', '💌', '💋', '💍', '💎'
    ],
    'Gestures': [
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
        '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
        '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷'
    ],
    'Animals': [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸',
        '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺',
        '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️'
    ],
    'Food': [
        '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝',
        '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐',
        '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔'
    ],
    'Activities': [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
        '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
        '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽'
    ],
    'Objects': [
        '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '🧮', '📱', '📞', '☎️', '📟', '📠',
        '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏰', '📯', '🔔', '🔕', '📢', '📣', '📯', '🎺', '📻',
        '⚡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰'
    ]
};

export default function EmojiPicker({ onSelectEmoji, onClose }: EmojiPickerProps) {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Smileys');

    const handleEmojiSelect = (emoji: string) => {
        onSelectEmoji(emoji);
    };

    const getFilteredEmojis = () => {
        if (!searchTerm.trim()) {
            return emojiCategories[selectedCategory as keyof typeof emojiCategories] || [];
        }

        // Search across all categories - show all emojis when searching
        // TODO: Could enhance this with emoji names/descriptions matching
        return Object.values(emojiCategories).flat();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col glass"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Select Emoji</h3>
                    <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close emoji picker" className="text-slate-300 hover:text-white">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search emojis..."
                        className="pl-10 glass text-white placeholder:text-slate-400"
                    />
                </div>

                {/* Category Tabs */}
                {!searchTerm && (
                    <div className="flex flex-wrap gap-1 mb-4">
                        {Object.keys(emojiCategories).map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                                className={`text-xs glass ${selectedCategory === category
                                    ? "bg-indigo-600/50 text-white"
                                    : "text-slate-300 hover:text-white"
                                    }`}
                            >
                                {category}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Emoji Grid */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-1">
                        {getFilteredEmojis().map((emoji, index) => (
                            <button
                                key={`${emoji}-${index}`}
                                onClick={() => handleEmojiSelect(emoji)}
                                className="aspect-square flex items-center justify-center text-2xl hover:bg-slate-700/50 rounded transition-colors"
                                title={emoji}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    {getFilteredEmojis().length === 0 && (
                        <div className="text-center text-slate-400 py-8">
                            No emojis found
                        </div>
                    )}
                </div>

                {/* Recently Used Section */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <p className="text-sm text-slate-400 mb-2">Recently Used:</p>
                    <div className="flex gap-1">
                        {['😀', '😂', '😍', '🔥', '👍', '❤️', '😊', '🎉'].map((emoji, index) => (
                            <button
                                key={`recent-${emoji}-${index}`}
                                onClick={() => handleEmojiSelect(emoji)}
                                className="text-xl hover:bg-slate-700/50 rounded p-1 transition-colors"
                                title={emoji}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 