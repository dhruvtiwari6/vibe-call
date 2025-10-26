'use client'

import {useEffect} from 'react'
import { useSearchParams, redirect} from 'next/navigation'

export default function ErrorPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    useEffect(()=> {
        if(error === 'AccessDenied') {
            redirect('/sign-up')
        }
    }, [error])

    return (
        <div>An unexpected error occured please try again .... {error}</div>
    )
}