import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export function CelebrationModal({ isOpen, onClose, title, description }: CelebrationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-4"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 2 }}
            className="text-6xl"
          >
            🎉
          </motion.div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">New Milestone!</h3>
            <h4 className="text-lg font-semibold text-primary mb-2">{title}</h4>
            <p className="text-gray-600 mb-6">{description}</p>
          </div>
          
          <Button 
            onClick={onClose}
            className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Awesome!
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
