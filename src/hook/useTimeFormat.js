import { useCallback } from 'react';

const useTimeFormat = () => {
  const formatTime = useCallback((dateString = "", isLocal = false) => {
    if (!dateString) return "N/A";

    let date;

    const isCustomFormat = typeof dateString === 'string' && /^\d{2}-\d{2}-\d{4}/.test(dateString);

    if (isCustomFormat) {
      try {
        const [datePart, timePart, ampm] = dateString.split(' ');
        const [day, month, year] = datePart.split('-');
        let [hours, minutes] = timePart.split(':');

        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);

        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        date = new Date(year, month - 1, day, hours, minutes);
      } catch (e) {
        return "Invalid Time";
      }
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) return "Invalid Time";

    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true, 
    };

    // if (!isLocal && !isCustomFormat) {
    //   options.timeZone = 'UTC';
    // }

    return new Intl.DateTimeFormat('en-US', options).format(date);
  }, []);

  return { formatTime };
};

export default useTimeFormat;